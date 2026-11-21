import math
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    WordModel,
    CaptionModel,
    WordQualityModel,
    CaptionQualityModel,
    TranscriptQualityReport
)

class CaptionIntelligenceService:
    """
    Offline AI & Linguistic Intelligence for CaptionLab (Milestone 5).
    Provides transcript refinement, pause-aware caption grouping,
    reading speed analysis, and quality metric scoring.
    """

    HINDI_FILLERS = {
        "मतलब", "तो", "यानी", "अरे", "अच्छा", "जैसे", "वैसे", "हाँ", "भाई", "हूँ"
    }

    ENGLISH_FILLERS = {
        "umm", "uh", "um", "like", "you know", "actually", "basically", "literally", "so", "right", "yeah"
    }

    # Reading speed benchmarks
    MIN_CPS = 6.0    # Slower than 6 chars/sec is sluggish
    MAX_CPS = 24.0   # Faster than 24 chars/sec is difficult to read
    OPTIMAL_CPS = 14.0

    MIN_WPM = 80.0
    MAX_WPM = 220.0

    @classmethod
    def is_filler_word(cls, text: str) -> bool:
        cleaned = text.strip().lower()
        return (cleaned in cls.HINDI_FILLERS) or (cleaned in cls.ENGLISH_FILLERS)

    @classmethod
    def analyze_words(cls, words: List[WordModel]) -> List[WordQualityModel]:
        """Analyzes each individual word for filler, repetition, and low confidence."""
        results = []
        prev_text = ""
        for w in words:
            text_clean = w.text.strip().lower()
            is_filler = cls.is_filler_word(text_clean)
            is_repeated = (text_clean == prev_text and len(text_clean) > 0)
            is_low_conf = (w.confidence is not None and w.confidence < 0.65)

            results.append(WordQualityModel(
                word_id=w.word_id,
                text=w.text,
                is_filler=is_filler,
                is_repeated=is_repeated,
                is_low_confidence=is_low_conf,
                confidence=w.confidence
            ))
            prev_text = text_clean
        return results

    @classmethod
    def analyze_caption_quality(
        cls,
        caption: CaptionModel,
        aspect_ratio: str = "16:9"
    ) -> CaptionQualityModel:
        """Analyzes duration, reading speed, and visual balance for a caption block."""
        duration = max(0.1, caption.end_time - caption.start_time)
        full_text = " ".join(w.text for w in caption.words)
        char_count = len(full_text)
        word_count = len(caption.words)

        cps = round(char_count / duration, 1)
        wpm = round((word_count / duration) * 60.0, 1)

        warnings = []
        if cps > cls.MAX_CPS:
            status = "fast"
            warnings.append(f"Fast reading speed: {cps} chars/sec (max recommended: {cls.MAX_CPS})")
        elif cps < cls.MIN_CPS and word_count > 1:
            status = "slow"
            warnings.append(f"Slow reading speed: {cps} chars/sec (min recommended: {cls.MIN_CPS})")
        else:
            status = "optimal"

        # Check line length constraints
        max_chars_single_line = 36 if aspect_ratio == "9:16" else 48
        if char_count > max_chars_single_line and caption.layout_family == "single_line":
            warnings.append(f"Single line exceeds recommended length ({char_count} chars)")

        # Safe area compliance check
        safe_compliant = True
        if aspect_ratio == "9:16":
            if caption.coordinates.y < 0.15 or caption.coordinates.y > 0.80:
                safe_compliant = False
                warnings.append("Caption outside 9:16 vertical safe margins")
        else:
            if caption.coordinates.y < 0.10 or caption.coordinates.y > 0.90:
                safe_compliant = False
                warnings.append("Caption outside title safe area")

        # Filler count
        filler_count = sum(1 for w in caption.words if cls.is_filler_word(w.text))
        if filler_count > 0:
            warnings.append(f"{filler_count} potential filler word(s) detected")

        # Line balance score (for two line layouts)
        balance_score = 1.0
        if word_count >= 4:
            mid = word_count // 2
            line1_len = sum(len(w.text) for w in caption.words[:mid])
            line2_len = sum(len(w.text) for w in caption.words[mid:])
            max_len = max(line1_len, line2_len)
            min_len = min(line1_len, line2_len)
            balance_score = round(min_len / max_len, 2) if max_len > 0 else 1.0

        return CaptionQualityModel(
            caption_id=caption.caption_id,
            cps=cps,
            wpm=wpm,
            reading_speed_status=status,
            line_balance_score=balance_score,
            safe_area_compliant=safe_compliant,
            filler_word_count=filler_count,
            warning_messages=warnings
        )

    @classmethod
    def generate_quality_report(
        cls,
        captions: List[CaptionModel],
        aspect_ratio: str = "16:9"
    ) -> TranscriptQualityReport:
        """Generates comprehensive quality report across all project captions."""
        all_words = [w for c in captions for w in c.words]
        total_words = len(all_words)
        total_captions = len(captions)

        if not captions:
            return TranscriptQualityReport(
                total_words=0,
                total_captions=0,
                average_cps=0.0,
                average_wpm=0.0,
                quality_score=100.0,
                filler_words_found=[],
                repeated_words_found=[],
                low_confidence_count=0,
                caption_reports=[]
            )

        caption_reports = [cls.analyze_caption_quality(c, aspect_ratio) for c in captions]
        word_reports = cls.analyze_words(all_words)

        fillers = [w.text for w in word_reports if w.is_filler]
        repeated = [w.text for w in word_reports if w.is_repeated]
        low_conf = sum(1 for w in word_reports if w.is_low_confidence)

        avg_cps = round(sum(r.cps for r in caption_reports) / len(caption_reports), 1) if caption_reports else 0.0
        avg_wpm = round(sum(r.wpm for r in caption_reports) / len(caption_reports), 1) if caption_reports else 0.0

        # Calculate score (deductions for warnings)
        penalty = 0.0
        for r in caption_reports:
            if r.reading_speed_status != "optimal":
                penalty += 3.0
            if not r.safe_area_compliant:
                penalty += 5.0
            penalty += r.filler_word_count * 1.5

        penalty += min(20.0, low_conf * 2.0)
        final_score = max(0.0, min(100.0, round(100.0 - penalty, 1)))

        return TranscriptQualityReport(
            total_words=total_words,
            total_captions=total_captions,
            average_cps=avg_cps,
            average_wpm=avg_wpm,
            quality_score=final_score,
            filler_words_found=list(set(fillers)),
            repeated_words_found=list(set(repeated)),
            low_confidence_count=low_conf,
            caption_reports=caption_reports
        )

    @classmethod
    def refine_words(
        cls,
        words: List[WordModel],
        remove_fillers: bool = False,
        remove_repetitions: bool = False
    ) -> List[WordModel]:
        """Refines transcript words non-destructively."""
        refined = []
        prev_text = ""
        for w in words:
            clean = w.text.strip().lower()
            if remove_fillers and cls.is_filler_word(clean):
                continue
            if remove_repetitions and clean == prev_text:
                continue
            refined.append(w)
            prev_text = clean
        return refined

caption_intelligence = CaptionIntelligenceService()
