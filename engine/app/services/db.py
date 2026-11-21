import sqlite3
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.core.config import settings

class DatabaseService:
    def __init__(self, db_path: Path = settings.DB_PATH):
        self.db_path = str(db_path)
        self._sync_init_db()

    def _sync_init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fps REAL DEFAULT 30.0,
                    width INTEGER DEFAULT 1920,
                    height INTEGER DEFAULT 1080,
                    data_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS recent_projects (
                    project_id TEXT PRIMARY KEY,
                    last_opened TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS custom_presets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'style',
                    version TEXT NOT NULL DEFAULT '1.3.0',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    preset_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS font_catalog (
                    family TEXT PRIMARY KEY,
                    postscript_name TEXT,
                    file_path TEXT NOT NULL,
                    supports_devanagari BOOLEAN DEFAULT 1,
                    is_custom BOOLEAN DEFAULT 0,
                    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    async def init_db(self):
        await asyncio.to_thread(self._sync_init_db)

    def _sync_save_project(self, project_id: str, name: str, version: str, data: Dict[str, Any]):
        data_str = json.dumps(data)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO projects (id, name, version, updated_at, data_json)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    version = excluded.version,
                    updated_at = CURRENT_TIMESTAMP,
                    data_json = excluded.data_json
            """, (project_id, name, version, data_str))
            
            cursor.execute("""
                INSERT INTO recent_projects (project_id, last_opened)
                VALUES (?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET last_opened = CURRENT_TIMESTAMP
            """, (project_id,))
            conn.commit()

    async def save_project(self, project_id: str, name: str, version: str, data: Dict[str, Any]):
        await asyncio.to_thread(self._sync_save_project, project_id, name, version, data)

    def _sync_get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
            return None

    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        return await asyncio.to_thread(self._sync_get_project, project_id)

    def _sync_list_recent_projects(self, limit: int) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id, p.name, p.version, p.updated_at, r.last_opened
                FROM projects p
                JOIN recent_projects r ON p.id = r.project_id
                ORDER BY r.last_opened DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "version": r[2],
                    "updated_at": r[3],
                    "last_opened": r[4]
                }
                for r in rows
            ]

    async def list_recent_projects(self, limit: int = 10) -> List[Dict[str, Any]]:
        return await asyncio.to_thread(self._sync_list_recent_projects, limit)

    def _sync_save_preset(self, preset_id: str, name: str, category: str, version: str, data: Dict[str, Any]):
        preset_str = json.dumps(data)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO custom_presets (id, name, category, version, updated_at, preset_json)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    category = excluded.category,
                    version = excluded.version,
                    updated_at = CURRENT_TIMESTAMP,
                    preset_json = excluded.preset_json
            """, (preset_id, name, category, version, preset_str))
            conn.commit()

    async def save_preset(self, preset_id: str, name: str, category: str, version: str, data: Dict[str, Any]):
        await asyncio.to_thread(self._sync_save_preset, preset_id, name, category, version, data)

    def _sync_get_preset(self, preset_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, category, version, created_at, updated_at, preset_json FROM custom_presets WHERE id = ?", (preset_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "version": row[3],
                    "created_at": row[4],
                    "updated_at": row[5],
                    "preset_data": json.loads(row[6])
                }
            return None

    async def get_preset(self, preset_id: str) -> Optional[Dict[str, Any]]:
        return await asyncio.to_thread(self._sync_get_preset, preset_id)

    def _sync_list_presets(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute("SELECT id, name, category, version, created_at, updated_at, preset_json FROM custom_presets WHERE category = ? ORDER BY updated_at DESC", (category,))
            else:
                cursor.execute("SELECT id, name, category, version, created_at, updated_at, preset_json FROM custom_presets ORDER BY updated_at DESC")
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "category": r[2],
                    "version": r[3],
                    "created_at": r[4],
                    "updated_at": r[5],
                    "preset_data": json.loads(r[6])
                }
                for r in rows
            ]

    async def list_presets(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await asyncio.to_thread(self._sync_list_presets, category)

    def _sync_delete_preset(self, preset_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM custom_presets WHERE id = ?", (preset_id,))
            conn.commit()
            return cursor.rowcount > 0

    async def delete_preset(self, preset_id: str) -> bool:
        return await asyncio.to_thread(self._sync_delete_preset, preset_id)

    def _sync_save_font(self, family: str, file_path: str, supports_devanagari: bool = True, is_custom: bool = False):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO font_catalog (family, file_path, supports_devanagari, is_custom)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(family) DO UPDATE SET
                    file_path = excluded.file_path,
                    supports_devanagari = excluded.supports_devanagari,
                    is_custom = excluded.is_custom
            """, (family, file_path, 1 if supports_devanagari else 0, 1 if is_custom else 0))
            conn.commit()

    async def save_font(self, family: str, file_path: str, supports_devanagari: bool = True, is_custom: bool = False):
        await asyncio.to_thread(self._sync_save_font, family, file_path, supports_devanagari, is_custom)

    def _sync_list_fonts(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT family, file_path, supports_devanagari, is_custom FROM font_catalog ORDER BY family ASC")
            rows = cursor.fetchall()
            return [
                {
                    "family": r[0],
                    "file_path": r[1],
                    "supports_devanagari": bool(r[2]),
                    "is_custom": bool(r[3])
                }
                for r in rows
            ]

    async def list_fonts(self) -> List[Dict[str, Any]]:
        return await asyncio.to_thread(self._sync_list_fonts)

db_service = DatabaseService()
