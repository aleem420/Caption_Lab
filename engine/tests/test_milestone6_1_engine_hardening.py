import os
import sys
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure engine path is available
ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings, get_windows_app_data_dir, get_windows_temp_dir, settings
from app.core.security import verify_session_token
from app.core.mutex import WindowsNamedMutex
from app.core.logging_config import TokenFilter
from app.services.migration_service import MigrationService
from app.services.font_service import get_system_font_dir, FontService

class TestMilestone61EngineHardening(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    # A & B: Windows Data Path Resolution & Fallbacks
    def test_01_windows_data_path_resolution(self):
        app_data = get_windows_app_data_dir()
        temp_dir = get_windows_temp_dir()
        self.assertTrue("CaptionLab" in str(app_data), "AppData path must contain 'CaptionLab'")
        self.assertTrue("CaptionLab" in str(temp_dir), "Temp path must contain 'CaptionLab'")

    def test_02_missing_environment_variable_fallback(self):
        with patch.dict(os.environ, {}, clear=True):
            fallback_app_data = get_windows_app_data_dir()
            fallback_temp = get_windows_temp_dir()
            self.assertTrue(str(fallback_app_data).endswith("CaptionLab"))
            self.assertTrue(str(fallback_temp).endswith("CaptionLab"))

    # C & D: Directory Creation & Permission Handling
    def test_03_directory_creation_and_writability(self):
        with tempfile.TemporaryDirectory() as tmp_root:
            custom_settings = Settings()
            custom_settings.APP_DATA_DIR = Path(tmp_root) / "AppData" / "CaptionLab"
            custom_settings.APP_TEMP_DIR = Path(tmp_root) / "Temp" / "CaptionLab"
            custom_settings.DATA_DIR = custom_settings.APP_DATA_DIR / "data"
            custom_settings.MODELS_DIR = custom_settings.APP_DATA_DIR / "models_cache"
            custom_settings.LOGS_DIR = custom_settings.APP_DATA_DIR / "logs"
            custom_settings.BACKUPS_DIR = custom_settings.APP_DATA_DIR / "backups"
            custom_settings.CONFIG_DIR = custom_settings.APP_DATA_DIR / "config"
            custom_settings.AUDIO_CACHE_DIR = custom_settings.APP_TEMP_DIR / "audio_cache"
            custom_settings.RENDERS_DIR = custom_settings.APP_TEMP_DIR / "renders"
            custom_settings.JOBS_DIR = custom_settings.APP_TEMP_DIR / "jobs"

            custom_settings.ensure_directories_exist()

            self.assertTrue(custom_settings.DATA_DIR.exists())
            self.assertTrue(custom_settings.MODELS_DIR.exists())
            self.assertTrue(custom_settings.LOGS_DIR.exists())
            self.assertTrue(custom_settings.AUDIO_CACHE_DIR.exists())
            self.assertTrue(custom_settings.RENDERS_DIR.exists())

    def test_04_permission_error_handling(self):
        custom_settings = Settings()
        with patch.object(Path, "mkdir", side_effect=PermissionError("Access Denied")):
            with self.assertRaises(PermissionError) as ctx:
                custom_settings.ensure_directories_exist()
            self.assertIn("cannot write to required directory", str(ctx.exception))

    # E, F, G: Safe Legacy Data Migration, Idempotency & SQLite Integrity
    def test_05_legacy_database_migration_and_integrity(self):
        with tempfile.TemporaryDirectory() as tmp_root:
            base_dir = Path(tmp_root) / "repo"
            app_data_dir = Path(tmp_root) / "local_app_data" / "CaptionLab"
            
            legacy_data_dir = base_dir / "data"
            legacy_data_dir.mkdir(parents=True, exist_ok=True)
            legacy_db = legacy_data_dir / "captionlab.db"

            # Create synthetic legacy SQLite database with table and row
            conn = sqlite3.connect(str(legacy_db))
            try:
                conn.execute("CREATE TABLE test_projects (id TEXT PRIMARY KEY, title TEXT);")
                conn.execute("INSERT INTO test_projects VALUES ('proj_1', 'Legacy Migration Test');")
                conn.commit()
            finally:
                conn.close()

            test_settings = Settings()
            test_settings.BASE_DIR = base_dir
            test_settings.APP_DATA_DIR = app_data_dir
            test_settings.DATA_DIR = app_data_dir / "data"
            test_settings.DB_PATH = test_settings.DATA_DIR / "captionlab.db"
            test_settings.MODELS_DIR = app_data_dir / "models_cache"

            migrator = MigrationService(target_settings=test_settings)
            report = migrator.run_migration()

            self.assertTrue(report["db_migrated"], "Database should be migrated")
            self.assertEqual(report["db_status"], "migrated_and_verified")
            self.assertTrue(test_settings.DB_PATH.exists())
            self.assertTrue(legacy_db.exists(), "Original legacy database must be preserved")

            # Verify integrity and data preservation in destination DB
            conn = sqlite3.connect(str(test_settings.DB_PATH))
            try:
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check;")
                self.assertEqual(cursor.fetchone()[0], "ok")
                cursor.execute("SELECT title FROM test_projects WHERE id = 'proj_1';")
                self.assertEqual(cursor.fetchone()[0], "Legacy Migration Test")
            finally:
                conn.close()

    def test_06_duplicate_migration_idempotent_protection(self):
        with tempfile.TemporaryDirectory() as tmp_root:
            base_dir = Path(tmp_root) / "repo"
            app_data_dir = Path(tmp_root) / "local_app_data" / "CaptionLab"
            
            dest_data_dir = app_data_dir / "data"
            dest_data_dir.mkdir(parents=True, exist_ok=True)
            dest_db = dest_data_dir / "captionlab.db"

            # Pre-populate destination DB
            conn = sqlite3.connect(str(dest_db))
            try:
                conn.execute("CREATE TABLE test_projects (id TEXT PRIMARY KEY, title TEXT);")
                conn.execute("INSERT INTO test_projects VALUES ('dest_1', 'Existing New DB');")
                conn.commit()
            finally:
                conn.close()

            # Create legacy DB
            legacy_data_dir = base_dir / "data"
            legacy_data_dir.mkdir(parents=True, exist_ok=True)
            legacy_db = legacy_data_dir / "captionlab.db"
            conn = sqlite3.connect(str(legacy_db))
            try:
                conn.execute("CREATE TABLE test_projects (id TEXT PRIMARY KEY, title TEXT);")
                conn.execute("INSERT INTO test_projects VALUES ('leg_1', 'Old DB');")
                conn.commit()
            finally:
                conn.close()

            test_settings = Settings()
            test_settings.BASE_DIR = base_dir
            test_settings.APP_DATA_DIR = app_data_dir
            test_settings.DATA_DIR = dest_data_dir
            test_settings.DB_PATH = dest_db
            test_settings.MODELS_DIR = app_data_dir / "models_cache"

            migrator = MigrationService(target_settings=test_settings)
            report = migrator.run_migration()

            # Destination must NOT be overwritten
            self.assertFalse(report["db_migrated"])
            self.assertEqual(report["db_status"], "destination_already_exists_preserved")
            conn = sqlite3.connect(str(dest_db))
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT title FROM test_projects;")
                rows = [r[0] for r in cursor.fetchall()]
                self.assertIn("Existing New DB", rows)
                self.assertNotIn("Old DB", rows)
            finally:
                conn.close()

    # H: Dynamic Windows Font Directory Lookup
    def test_07_dynamic_font_lookup(self):
        font_dir = get_system_font_dir()
        self.assertTrue(font_dir.exists(), f"System font directory '{font_dir}' must exist")
        self.assertTrue("Fonts" in str(font_dir))

        search_dirs = FontService.get_font_search_dirs()
        self.assertGreaterEqual(len(search_dirs), 1)

        # Verify font resolution does not crash and handles known families
        resolved = FontService().resolve_font_path("Arial")
        self.assertIsNotNone(resolved)
        self.assertTrue(Path(resolved).exists())

    # I, J, K, L: Session Token Security & Route Protection
    def test_08_invalid_session_token_rejected_with_401(self):
        resp = self.client.get(
            "/health/diagnostics",
            headers={"X-CaptionLab-Token": "invalid_wrong_token_12345"}
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid session token", resp.json()["detail"])

    def test_09_missing_session_token_rejected_when_enforced(self):
        # When X-Test-Enforce-Auth is set, missing token must return 401
        resp = self.client.get(
            "/health/diagnostics",
            headers={"X-Test-Enforce-Auth": "1"}
        )
        self.assertEqual(resp.status_code, 401)

    def test_10_valid_session_token_accepted_on_protected_routes(self):
        valid_headers = {"X-CaptionLab-Token": settings.SESSION_TOKEN}
        
        # Diagnostics
        diag_resp = self.client.get("/health/diagnostics", headers=valid_headers)
        self.assertEqual(diag_resp.status_code, 200)

        # Transcribe models
        models_resp = self.client.get("/transcribe/models", headers=valid_headers)
        self.assertEqual(models_resp.status_code, 200)

        # Presets
        presets_resp = self.client.get("/presets/all", headers=valid_headers)
        self.assertEqual(presets_resp.status_code, 200)

        # Recent projects
        recent_resp = self.client.get("/projects/recent", headers=valid_headers)
        self.assertEqual(recent_resp.status_code, 200)

    def test_11_health_endpoint_public_bootstrap_behavior(self):
        # Health endpoint should be 200 without token
        resp = self.client.get("/health/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["session_token"], settings.SESSION_TOKEN)

        # Request with untrusted web origin should not receive session token
        untrusted_resp = self.client.get("/health/", headers={"Origin": "https://malicious-website.com"})
        self.assertEqual(untrusted_resp.status_code, 200)
        self.assertEqual(untrusted_resp.json()["session_token"], "REDACTED")

    # M, N, O, P: Windows Named Mutex Single-Instance Protection
    def test_12_windows_named_mutex_lifecycle(self):
        mutex_name = "Local\\TestCaptionLabMutex_Unit"
        m1 = WindowsNamedMutex(mutex_name)
        m2 = WindowsNamedMutex(mutex_name)

        try:
            # First instance acquires successfully
            acq1 = m1.acquire()
            self.assertTrue(acq1, "First instance must acquire mutex")

            # Second instance must detect existing instance and return False
            acq2 = m2.acquire()
            self.assertFalse(acq2, "Second instance must not acquire same mutex")
        finally:
            m1.release()
            m2.release()

        # After release, acquisition should succeed again
        m3 = WindowsNamedMutex(mutex_name)
        try:
            acq3 = m3.acquire()
            self.assertTrue(acq3, "Mutex must be re-acquirable after release")
        finally:
            m3.release()

    # Q: Token Scrubbing in Logging
    def test_13_logging_scrubs_session_token(self):
        class DummyRecord:
            def __init__(self, msg):
                self.msg = msg

        token_filter = TokenFilter()
        record = DummyRecord(f"Attempting login with token {settings.SESSION_TOKEN} in request")
        token_filter.filter(record)

        self.assertNotIn(settings.SESSION_TOKEN, record.msg)
        self.assertIn("••••••••[REDACTED]", record.msg)

if __name__ == "__main__":
    unittest.main()
