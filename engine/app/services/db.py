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

db_service = DatabaseService()
