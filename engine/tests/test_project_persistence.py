import unittest
import sys
import uuid
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure engine path is in sys.path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from app.main import app

class TestProjectPersistence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.services.db import db_service
        db_service._sync_init_db()

    def setUp(self):
        self.client = TestClient(app)

    def test_save_and_get_project(self):
        project_id = f"test_proj_{uuid.uuid4().hex[:8]}"
        project_payload = {
            "project": {
                "id": project_id,
                "name": "Integration Test Project",
                "version": "1.2.0",
                "fps": 25.0,
                "width": 1920,
                "height": 1080
            },
            "transcript": {
                "language": "hindi_mixed",
                "engine": "faster-whisper",
                "model_size": "small",
                "sentences": [
                    {
                        "sentence_id": "s1",
                        "speaker_id": None,
                        "start": 0.0,
                        "end": 2.5,
                        "text": "नमस्ते दोस्तों",
                        "words": [
                            {"word_id": "w1", "text": "नमस्ते", "start": 0.0, "end": 1.2, "confidence": 0.99, "corrected": False},
                            {"word_id": "w2", "text": "दोस्तों", "start": 1.3, "end": 2.5, "confidence": 0.98, "corrected": False}
                        ]
                    }
                ],
                "words": []
            },
            "captions": [
                {
                    "caption_id": "c1",
                    "start_time": 0.0,
                    "end_time": 2.5,
                    "start_frame": 0,
                    "end_frame": 62,
                    "duration": 2.5,
                    "words": [
                        {"word_id": "w1", "text": "नमस्ते", "start": 0.0, "end": 1.2, "confidence": 0.99, "corrected": False},
                        {"word_id": "w2", "text": "दोस्तों", "start": 1.3, "end": 2.5, "confidence": 0.98, "corrected": False}
                    ],
                    "layout_family": "balanced_two_line",
                    "coordinates": {"x": 0.5, "y": 0.82, "width": 0.85, "height": 0.15},
                    "typography": {"font_family": "Noto Sans Devanagari", "font_size": 46},
                    "background": {"enabled": False},
                    "animation": {"entrance": {"type": "pop_in"}},
                    "user_overridden_properties": []
                }
            ],
            "presets": []
        }

        # 1. Save project
        save_resp = self.client.post("/projects/save", json=project_payload)
        self.assertEqual(save_resp.status_code, 200)
        save_data = save_resp.json()
        self.assertEqual(save_data["status"], "saved")
        self.assertEqual(save_data["project_id"], project_id)

        # 2. Get project
        get_resp = self.client.get(f"/projects/get/{project_id}")
        self.assertEqual(get_resp.status_code, 200)
        loaded = get_resp.json()
        self.assertEqual(loaded["project"]["id"], project_id)
        self.assertEqual(loaded["project"]["name"], "Integration Test Project")
        self.assertEqual(len(loaded["transcript"]["sentences"]), 1)
        self.assertEqual(loaded["transcript"]["sentences"][0]["text"], "नमस्ते दोस्तों")
        self.assertEqual(len(loaded["captions"]), 1)
        self.assertEqual(loaded["captions"][0]["caption_id"], "c1")

    def test_get_nonexistent_project(self):
        resp = self.client.get("/projects/get/non_existent_proj_xyz_123")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["detail"], "Project not found")

    def test_save_project_missing_id(self):
        resp = self.client.post("/projects/save", json={"project": {"name": "No ID Project"}})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Missing project.id", resp.json()["detail"])

    def test_list_recent_projects(self):
        project_id = f"test_recent_{uuid.uuid4().hex[:8]}"
        project_payload = {
            "project": {
                "id": project_id,
                "name": "Recent Listing Project",
                "version": "1.2.0"
            },
            "transcript": {"sentences": [], "words": []},
            "captions": [],
            "presets": []
        }
        self.client.post("/projects/save", json=project_payload)

        recent_resp = self.client.get("/projects/recent")
        self.assertEqual(recent_resp.status_code, 200)
        recents = recent_resp.json()
        self.assertIsInstance(recents, list)
        self.assertGreater(len(recents), 0)
        ids = [p["id"] for p in recents]
        self.assertIn(project_id, ids)

    def test_update_existing_project(self):
        project_id = f"test_update_{uuid.uuid4().hex[:8]}"
        project_payload = {
            "project": {
                "id": project_id,
                "name": "Initial Project Name",
                "version": "1.2.0"
            },
            "transcript": {"sentences": [], "words": []},
            "captions": [],
            "presets": []
        }
        self.client.post("/projects/save", json=project_payload)

        # Now update
        project_payload["project"]["name"] = "Updated Project Name"
        project_payload["captions"] = [{"caption_id": "c_new", "words": []}]
        update_resp = self.client.post("/projects/save", json=project_payload)
        self.assertEqual(update_resp.status_code, 200)

        # Retrieve and verify updated state
        get_resp = self.client.get(f"/projects/get/{project_id}")
        self.assertEqual(get_resp.status_code, 200)
        loaded = get_resp.json()
        self.assertEqual(loaded["project"]["name"], "Updated Project Name")
        self.assertEqual(len(loaded["captions"]), 1)
        self.assertEqual(loaded["captions"][0]["caption_id"], "c_new")

if __name__ == "__main__":
    unittest.main()
