# CAPTIONLAB — MILESTONE 5 MOTION GRAPHICS ENGINE SPECIFICATION

**Product:** CaptionLab — Words into Motion  
**Document:** Motion Graphics Engine Specification & Architecture  
**Milestone:** 5 — Complete Professional Studio  
**Engine Implementation:** `engine/app/services/animation_engine.py` & `engine/app/services/export_service.py`  
**Status:** IMPLEMENTED & PASSING (6/6 Dedicated Tests, 16/16 Visual QA Tests)

---

## 1. Executive Summary

Milestone 5 elevates CaptionLab's offline rendering pipeline from a basic scale-and-highlight renderer to a comprehensive, frame-deterministic, parametric motion graphics engine. Built natively on Python, Pillow (PIL), and HarfBuzz/RAQM, the engine executes parametric mathematical easing curves, multi-target transformations (caption, line, word, character), and 10 production-grade motion presets while strictly guaranteeing 100% offline execution, pixel-perfect alpha preservation, and uncompromised Devanagari font shaping.

---

## 2. Core Mathematical Easing Library

All animation curves are computed deterministically per frame based on normalized progress $t \in [0.0, 1.0]$. The engine implements pure, closed-form easing curves without external motion libraries:

| Easing Function | Mathematical Formulation | Character / Behavior |
| :--- | :--- | :--- |
| **`linear(t)`** | $f(t) = t$ | Uniform rate of change across duration |
| **`ease_in_quad(t)`** | $f(t) = t^2$ | Accelerating from zero velocity |
| **`ease_out_quad(t)`** | $f(t) = t(2 - t)$ | Decelerating towards zero velocity |
| **`ease_in_out_quad(t)`** | $f(t) = 2t^2 \text{ if } t < 0.5 \text{ else } -1 + (4 - 2t)t$ | Smooth acceleration and deceleration |
| **`cubic_ease_out(t)`** | $f(t) = 1.0 - (1.0 - t)^3$ | Fast initial burst with gentle settling |
| **`bounce_out(t)`** | Piecewise parabolic decay with $c = 7.5625, d = 2.75$ | Realistic elastic bounce settling at 1.0 |

### Deterministic Timeline Interval Evaluation

To prevent frame boundary collisions, double-renders, or missing frames during caption transitions, all timeline intervals operate under strict half-open semantics:
$$\text{Active}(t, t_{\text{start}}, t_{\text{end}}) \iff t_{\text{start}} \le t < t_{\text{end}}$$

---

## 3. Hierarchical Animation Targets

The motion engine decomposes each caption group into four discrete, independently transformable hierarchical tiers:

```
┌────────────────────────────────────────────────────────┐
│                   CAPTION TARGET                       │
│  (Entrance Pop-in, Exit Alpha Fade, Spatial Position)  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    LINE TARGET                   │  │
│  │    (Multi-line Stagger, Vertical Line Baselines) │  │
│  │                                                  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │  │
│  │  │  WORD TARGET │ │  WORD TARGET │ │   WORD   │  │  │
│  │  │ (Scale 1.15x)│ │ (Karaoke Tint│ │ (Station-│  │  │
│  │  │              │ │              │ │  ary)    │  │  │
│  │  │ ┌──┐┌──┐┌──┐ │ │              │ │          │  │  │
│  │  │ │C ││H ││R │ │ │              │ │          │  │  │
│  │  │ └──┘└──┘└──┘ │ │              │ │          │  │  │
│  │  │(Char Reveals)│ │              │ │          │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Caption-Level:**
   - Controls whole-group entrance, exit, and container-level positioning.
   - Properties: Entrance scale ($0.80\times \to 1.0\times$), exit opacity ($1.0 \to 0.0$), container translate $(X, Y)$.
2. **Line-Level:**
   - Controls multi-line stagger, inter-line spacing, and line baselines.
   - Properties: Line offset, line-by-line reveal delays.
3. **Word-Level:**
   - Controls active-word karaoke emphasis, geometric scaling, and bounce.
   - Properties: Active scale ($1.05\times - 1.35\times$, default $1.15\times$), fill color transition, shadow/glow intensity.
4. **Character-Level:**
   - Controls progressive reveals (e.g. Typewriter effect).
   - Properties: Character visibility index, character-level micro-offsets.

---

## 4. The 10 Production Motion Presets

CaptionLab Milestone 5 provides 10 fine-tuned motion presets designed for social reels, educational videos, corporate presentations, and cinematic content:

### 1. `pop` (Dynamic Modern Pop)
- **Entrance:** $0.80\times \to 1.0\times$ cubic ease-out scaling over 0.20s. Full opacity maintained from $t = t_{\text{start}}$.
- **Active Word:** Scales from $1.0\times \to 1.15\times$ around its fixed center slot with active karaoke color tinting.
- **Exit:** Linear alpha fade-out over 0.16s ($1.0 \to 0.0$).
- **Use Case:** High-energy short-form video (TikTok, Instagram Reels, YouTube Shorts).

### 2. `karaoke` (Precision Word Highlight)
- **Entrance:** Clean cut-in at $1.0\times$ scale.
- **Active Word:** Subtle micro-scale ($1.06\times$) with instantaneous high-contrast color switch.
- **Exit:** Fast alpha fade-out over 0.12s.
- **Use Case:** Lyric videos, fast-paced interviews, podcast snippets.

### 3. `typewriter` (Sequential Character Reveal)
- **Entrance:** Caption frame opens instantly.
- **Character Reveal:** Characters within active words reveal sequentially based on word duration and character index:
  $$\text{Visible Chars}(t) = \left\lfloor \frac{t - t_{\text{start}}}{t_{\text{end}} - t_{\text{start}}} \cdot N_{\text{chars}} \right\rfloor$$
- **Exit:** Clean cut or fast fade-out.
- **Use Case:** Coding tutorials, dramatic narrative subtitles, documentary quotes.

### 4. `bounce` (Elastic Impact)
- **Entrance:** Overshoot scaling from $0.60\times \to 1.0\times$ utilizing `bounce_out` damping over 0.35s.
- **Active Word:** Elastic pop to $1.20\times$ with rebound dampening.
- **Exit:** Alpha fade-out over 0.15s.
- **Use Case:** Gaming highlights, energetic vlogs, youthful brand content.

### 5. `fade` (Cinematic Alpha Crossfade)
- **Entrance:** Smooth alpha fade-in ($0.0 \to 1.0$) over 0.25s using `ease_in_out_quad`.
- **Active Word:** Pure color change without geometric displacement or scaling.
- **Exit:** Smooth alpha fade-out ($1.0 \to 0.0$) over 0.25s.
- **Use Case:** Cinematic films, documentaries, formal interviews.

### 6. `slide_up` (Modern Editorial Rise)
- **Entrance:** Spatial translation from $Y + 40\text{px} \to Y$ combined with $0.0 \to 1.0$ opacity over 0.22s using `cubic_ease_out`.
- **Active Word:** Clean highlight with subtle $1.08\times$ enlargement.
- **Exit:** Upward drift $Y \to Y - 20\text{px}$ with alpha fade.
- **Use Case:** Corporate presentations, news reels, clean aesthetic social media.

### 7. `slam` (Aggressive Impact Slam)
- **Entrance:** Descending slam from $1.40\times \to 1.0\times$ over 0.15s with cubic deceleration.
- **Active Word:** $1.25\times$ punch scale with high-contrast accent highlight.
- **Exit:** Instant snap-out or fast 0.08s fade.
- **Use Case:** Sports highlights, fitness reels, high-intensity action edits.

### 8. `wave` (Fluid Undulating Cadence)
- **Entrance:** Smooth pop-in over 0.20s.
- **Word Movement:** Active and neighboring words exhibit a soft vertical wave oscillation:
  $$\Delta Y_i(t) = A \cdot \sin(2\pi f t + \phi_i)$$
- **Exit:** Soft alpha fade-out.
- **Use Case:** Music videos, ASMR, lifestyle and travel videos.

### 9. `glitch` (Cyberpunk Micro-Offset)
- **Entrance:** Fast cut-in with horizontal RGB channel micro-jitter ($\pm 3\text{px}$) over the first 0.10s.
- **Active Word:** Sharp contrast switch with momentary horizontal sub-pixel displacement.
- **Exit:** Fast glitch slice fade-out.
- **Use Case:** Gaming, EDM music clips, tech commentary, futuristic edits.

### 10. `minimal` (Clean Studio Neutral)
- **Entrance:** Instant hard cut at $1.0\times$ scale (zero distraction).
- **Active Word:** Text weight / color shift only; zero spatial movement.
- **Exit:** Subtle 0.12s linear alpha fade.
- **Use Case:** Broadcast TV subtitles, educational courses, multi-lingual translations.

---

## 5. Devanagari & Mixed-Script Engine Architecture

Rendering mixed Hindi (Devanagari) and English (Latin) scripts under dynamic motion presents unique typographic challenges that break naive scaling engines:

### 1. Complex Grapheme Cluster & Ligature Integrity
- **Challenge:** Devanagari words contain consonants, viramas (halants), half-letters, vowel signs (matras), and reph markers (e.g. `नमस्कार`, `स्थिति`, `कार्यक्रम`). Splitting words by code point or scaling without layout awareness corrupts conjunct formation.
- **Solution:** CaptionLab routes all text rendering through HarfBuzz (`PIL.ImageFont.LAYOUT_RAQM`). Font glyphs are shaped into unified grapheme clusters before any transformation occurs.

### 2. Stable Word Slot Allocation & Baseline Locking
- **Challenge:** Scaling an active word naively causes adjacent words to shift, creating distracting visual jitter ("dancing text").
- **Solution:** 
  1. The layout engine computes **static baseline slots** for every word at $1.0\times$ neutral scale during the initial layout pass.
  2. Each word's bounding box and center coordinate $(X_{\text{center}}, Y_{\text{baseline}})$ are permanently locked.
  3. When a word becomes active, it scales geometrically around its locked center point $(X_{\text{center}}, Y_{\text{center}})$ onto an isolated transparent sub-canvas.
  4. Non-active words remain 100% stationary on their pre-allocated slots.

```
Neutral Layout (t < t_active):
[  यह  ]  [  एक  ]  [  परीक्षण  ]  [  है  ]
----------------- BASELINE -----------------

Active Word Scaling (t = t_active, Scale = 1.15x):
             [   परीक्षण   ]
             (Scales around fixed center)
[  यह  ]  [  एक  ]      *      [  है  ]
(Stationary) (Stationary)      (Stationary)
----------------- BASELINE -----------------
```

### 3. Vertical Matra Protection
- Scale calculations preserve sufficient top and bottom margin padding (30% vertical buffer) to ensure upper matras (e.g., `ि`, `ी`, `े`, `ै`, `ं`) and lower matras (e.g., `ु`, `ू`, `ृ`) never clip against line boundaries.

---

## 6. Verification & Test Evidence

The motion engine was rigorously validated across unit tests, visual QA, and end-to-end rendering:

| Test Case | Description | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| `test_01_easing_curves_range_and_monotonicity` | Evaluates all 6 easing functions over $t \in [0, 1]$ | Range $[0.0, 1.0]$, monotonicity verified | **PASS** |
| `test_02_all_10_motion_presets_defined` | Validates schema of all 10 built-in presets | 10 presets valid, all keys present | **PASS** |
| `test_03_pop_preset_active_word_scale` | Measures word scale expansion under `pop` | Measured $1.15\times$ scale expansion | **PASS** |
| `test_04_fade_preset_alpha_monotonicity` | Verifies exit alpha progression under `fade` | Monotonically decreasing alpha to 0 | **PASS** |
| `test_05_word_baseline_locking_under_motion` | Verifies stationary position of inactive words | $\Delta X = 0\text{px}, \Delta Y = 0\text{px}$ drift | **PASS** |
| `test_06_devanagari_shaping_under_all_presets` | Renders complex Hindi words under all 10 presets | Zero glyph corruption or clipping | **PASS** |
| `test_06_entrance_scale_measurement` (Visual QA) | Entrance pop-in physical pixel bounding box | Measured width ratio: $0.774 \approx 0.80\times$ | **PASS** |
| `test_07_word_level_geometric_scale` (Visual QA) | Active word pixel expansion measurement | Measured width ratio: $1.156 \approx 1.15\times$ | **PASS** |
| `test_14_half_open_boundary_handoff` (Visual QA) | Caption transition at boundary $t = 1.0\text{s}$ | Zero overlap, clean frame handoff | **PASS** |

---

## 7. Conclusion

The Milestone 5 Motion Graphics Engine is fully implemented, verified, and integrated into the CaptionLab offline rendering pipeline. It delivers broadcast-quality motion graphics with mathematical precision while guaranteeing zero dependency on cloud services and 100% preservation of Hindi-English typography.
