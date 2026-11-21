import os
import shutil
import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("captionlab.migration")

class MigrationService:
    """
    Manages safe, non-destructive migration of legacy project databases,
    cached AI models, and configuration from legacy in-repo paths to
    the Windows user data directory (%LOCALAPPDATA%\\CaptionLab).
    """

    def __init__(self, target_settings=settings):
        self.settings = target_settings

    def run_migration(self) -> Dict[str, Any]:
        """
        Executes idempotent migration of legacy assets.
        Returns a summary report of migrated items.
        """
        report = {
            "db_migrated": False,
            "db_status": "none",
            "models_migrated": [],
            "models_skipped": [],
            "conflicts": [],
        }

        # 1. Database Migration
        self._migrate_database(report)

        # 2. Models Cache Migration
        self._migrate_models_cache(report)

        return report

    def _migrate_database(self, report: Dict[str, Any]):
        dest_db = self.settings.DB_PATH
        legacy_db_candidates = [
            self.settings.BASE_DIR / "data" / "captionlab.db",
            self.settings.BASE_DIR / "engine" / "data" / "captionlab.db",
        ]

        # Find the first existing legacy DB that is not the same as dest_db
        legacy_db: Optional[Path] = None
        for candidate in legacy_db_candidates:
            if candidate.exists() and candidate.resolve() != dest_db.resolve():
                legacy_db = candidate
                break

        if not legacy_db:
            report["db_status"] = "no_legacy_db_found"
            return

        # Case A: Destination does not exist -> Migrate using SQLite backup API
        if not dest_db.exists():
            try:
                dest_db.parent.mkdir(parents=True, exist_ok=True)
                logger.info(f"Migrating legacy database from '{legacy_db}' to '{dest_db}'...")
                
                src_conn = sqlite3.connect(str(legacy_db))
                dst_conn = sqlite3.connect(str(dest_db))
                try:
                    src_conn.backup(dst_conn)
                finally:
                    dst_conn.close()
                    src_conn.close()
                
                # Verify integrity of the destination database
                verify_conn = sqlite3.connect(str(dest_db))
                try:
                    cursor = verify_conn.cursor()
                    cursor.execute("PRAGMA integrity_check;")
                    check_result = cursor.fetchone()
                    if check_result and check_result[0] == "ok":
                        report["db_migrated"] = True
                        report["db_status"] = "migrated_and_verified"
                        logger.info(f"Database migration successful and verified ({dest_db.stat().st_size} bytes).")
                    else:
                        report["db_status"] = f"integrity_check_failed: {check_result}"
                        logger.error(f"Integrity check failed for migrated database: {check_result}")
                finally:
                    verify_conn.close()
            except Exception as e:
                report["db_status"] = f"error: {e}"
                logger.error(f"Failed to migrate database from '{legacy_db}': {e}")
            except Exception as e:
                report["db_status"] = f"error: {e}"
                logger.error(f"Failed to migrate database from '{legacy_db}': {e}")
        else:
            # Case B: Destination already exists -> Preserve both, do NOT overwrite
            report["db_migrated"] = False
            report["db_status"] = "destination_already_exists_preserved"
            report["conflicts"].append({
                "type": "database",
                "legacy_path": str(legacy_db),
                "dest_path": str(dest_db),
                "message": "Both legacy and new databases exist. Preserved destination without overwriting."
            })
            logger.info(f"Database already exists at '{dest_db}'. Preserved existing user database.")

    def _migrate_models_cache(self, report: Dict[str, Any]):
        dest_models_dir = self.settings.MODELS_DIR
        legacy_models_candidates = [
            self.settings.BASE_DIR / "models_cache",
            self.settings.BASE_DIR / "engine" / "models_cache",
        ]

        legacy_models_dir: Optional[Path] = None
        for candidate in legacy_models_candidates:
            if candidate.exists() and candidate.resolve() != dest_models_dir.resolve():
                legacy_models_dir = candidate
                break

        if not legacy_models_dir:
            return

        try:
            for item in legacy_models_dir.iterdir():
                if item.name.startswith("."):
                    continue
                dest_item = dest_models_dir / item.name
                if not dest_item.exists():
                    logger.info(f"Migrating model cache '{item.name}' to '{dest_item}'...")
                    if item.is_dir():
                        shutil.copytree(str(item), str(dest_item))
                    else:
                        shutil.copy2(str(item), str(dest_item))
                    report["models_migrated"].append(item.name)
                else:
                    report["models_skipped"].append(item.name)
        except Exception as e:
            logger.error(f"Error migrating model cache from '{legacy_models_dir}': {e}")

migration_service = MigrationService()
