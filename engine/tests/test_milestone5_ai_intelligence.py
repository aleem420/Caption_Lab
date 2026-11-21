import unittest
from app.services.caption_intelligence import caption_intelligence, CaptionIntelligenceService
from app.models.schemas import WordModel, CaptionModel

class TestMilestone5AIIntelligence(unittest.TestCase):
    """
    Automated test suite for Milestone 5 AI Caption Intelligence.
    Validates transcript refinement, filler word identification,
    stutter repetition detection, and reading speed calculations.
    """

    def test_01_hindi_and_english_filler_word_detection(self):
        """Validates detection of Hindi and English filler words without false positives."""
        hindi_fillers = ["मतलब", "तो", "यानी", "अरे", "अच्छा"]
        for f in hindi_fillers:
            self.assertTrue(CaptionIntelligenceService.is_filler_word(f), f"Expected '{f}' to be flagged as filler")

        eng_fillers = ["umm", "uh", "like", "you know", "actually"]
        for f in eng_fillers:
            self.assertTrue(CaptionIntelligenceService.is_filler_word(f), f"Expected '{f}' to be flagged as filler")

        legit_words = ["नमस्ते", "भारत", "प्रोजेक्ट", "camera", "motion", "creative"]
        for w in legit_words:
            self.assertFalse(CaptionIntelligenceService.is_filler_word(w), f"Legitimate word '{w}' falsely flagged")

    def test_02_repeated_word_detection(self):
        """Validates detection of consecutive identical stutter words."""
        words = [
            WordModel(word_id="w1", text="मैं", start=0.0, end=0.3),
            WordModel(word_id="w2", text="मैं", start=0.35, end=0.6),
            WordModel(word_id="w3", text="चाहता", start=0.65, end=1.0)
        ]
        analyzed = caption_intelligence.analyze_words(words)
        self.assertFalse(analyzed[0].is_repeated)
        self.assertTrue(analyzed[1].is_repeated) # Second 'मैं' is a stutter
        self.assertFalse(analyzed[2].is_repeated)

    def test_03_non_destructive_word_refinement(self):
        """Validates non-destructive transcript word cleaning."""
        words = [
            WordModel(word_id="w1", text="मतलब", start=0.0, end=0.4), # filler
            WordModel(word_id="w2", text="यह", start=0.45, end=0.8),
            WordModel(word_id="w3", text="यह", start=0.85, end=1.2),  # repetition
            WordModel(word_id="w4", text="अच्छा", start=1.25, end=1.6), # filler
            WordModel(word_id="w5", text="प्रोजेक्ट", start=1.65, end=2.2)
        ]
        refined = caption_intelligence.refine_words(words, remove_fillers=True, remove_repetitions=True)
        # Should keep "यह" and "प्रोजेक्ट"
        texts = [w.text for w in refined]
        self.assertEqual(texts, ["यह", "प्रोजेक्ट"])

    def test_04_reading_speed_cps_and_wpm(self):
        """Validates characters-per-second and words-per-minute calculations."""
        # 10 words over 2 seconds -> 300 WPM (fast)
        words = [WordModel(word_id=f"w{i}", text=f"शब्द{i}", start=i*0.2, end=(i+1)*0.2) for i in range(10)]
        cap = CaptionModel(
            caption_id="cap_speed",
            start_time=0.0,
            end_time=2.0,
            duration=2.0,
            words=words
        )
        report = caption_intelligence.analyze_caption_quality(cap, aspect_ratio="16:9")
        self.assertEqual(report.reading_speed_status, "fast")
        self.assertEqual(report.wpm, 300.0)
        self.assertGreater(len(report.warning_messages), 0)

    def test_05_comprehensive_quality_report_score(self):
        """Validates overall quality score generation with warning deductions."""
        words = [
            WordModel(word_id="w1", text="नमस्ते", start=0.0, end=0.6, confidence=0.98),
            WordModel(word_id="w2", text="दोस्तों", start=0.65, end=1.2, confidence=0.95),
            WordModel(word_id="w3", text="स्वागत", start=1.25, end=1.8, confidence=0.96)
        ]
        cap = CaptionModel(
            caption_id="cap_good",
            start_time=0.0,
            end_time=1.8,
            duration=1.8,
            words=words
        )
        report = caption_intelligence.generate_quality_report([cap], aspect_ratio="16:9")
        self.assertEqual(report.total_words, 3)
        self.assertEqual(report.total_captions, 1)
        self.assertEqual(report.quality_score, 100.0) # Flawless caption

if __name__ == "__main__":
    unittest.main()
