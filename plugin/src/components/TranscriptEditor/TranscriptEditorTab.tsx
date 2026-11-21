import React, { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  Pause,
  Clock,
  Edit2,
  Trash2,
  Plus,
  Search,
  Check,
  Split,
  Merge,
  Volume2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { WordItem, SentenceSegment } from '../../types';

export const TranscriptEditorTab: React.FC = () => {
  const {
    project,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    updateWordText,
    updateWordTiming,
    setWordHighlightColor,
    activeWordId,
    setActiveWordId,
    splitSentence,
    mergeSentences,
    recalculateCaptionGroupings,
    qualityReport,
    isAnalyzingQuality,
    runQualityAnalysis,
    refineTranscript,
  } = useProjectStore();

  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegrouping, setIsRegrouping] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const sentences = project.transcript.sentences || [];

  // Playback loop advancing currentTime
  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      let lastTime = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        const maxTime = sentences.length > 0 ? sentences[sentences.length - 1].end : 10;
        const nextTime = useProjectStore.getState().currentTime + delta;
        if (nextTime >= maxTime) {
          setCurrentTime(maxTime);
          setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
          animId = requestAnimationFrame(tick);
        }
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, sentences, setCurrentTime, setIsPlaying]);

  const handleWordClick = (word: WordItem) => {
    setActiveWordId(word.word_id);
    setCurrentTime(word.start);
  };

  const handleStartEdit = (word: WordItem) => {
    setEditingWordId(word.word_id);
    setEditText(word.text);
  };

  const handleSaveEdit = (wordId: string) => {
    if (editText.trim()) {
      updateWordText(wordId, editText.trim());
    }
    setEditingWordId(null);
  };

  const handleRegroupCaptions = async () => {
    setIsRegrouping(true);
    try {
      await recalculateCaptionGroupings();
    } finally {
      setIsRegrouping(false);
    }
  };

  // Locate active word and its parent sentence
  let activeWord: WordItem | undefined;
  let activeSentence: SentenceSegment | undefined;
  let activeWordIndex = -1;

  for (const s of sentences) {
    const idx = s.words.findIndex((w) => w.word_id === activeWordId);
    if (idx !== -1) {
      activeWord = s.words[idx];
      activeSentence = s;
      activeWordIndex = idx;
      break;
    }
  }

  // Navigate to previous/next word
  const allWords = sentences.flatMap((s) => s.words);
  const currentGlobalWordIdx = activeWord ? allWords.findIndex((w) => w.word_id === activeWord.word_id) : -1;

  const handlePrevWord = () => {
    if (currentGlobalWordIdx > 0) {
      const prev = allWords[currentGlobalWordIdx - 1];
      setActiveWordId(prev.word_id);
      setCurrentTime(prev.start);
    }
  };

  const handleNextWord = () => {
    if (currentGlobalWordIdx !== -1 && currentGlobalWordIdx < allWords.length - 1) {
      const next = allWords[currentGlobalWordIdx + 1];
      setActiveWordId(next.word_id);
      setCurrentTime(next.start);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
      {/* Top Toolbar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => {
              setCurrentTime(0.0);
              setIsPlaying(false);
            }}
            title="Reset Playhead to Start"
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="font-mono text-zinc-300 text-xs flex items-center space-x-1 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>{currentTime.toFixed(2)}s</span>
          </div>

          <button
            onClick={handleRegroupCaptions}
            disabled={isRegrouping || allWords.length === 0}
            title="Auto-group transcript into synchronized caption cues"
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isRegrouping ? 'Grouping...' : 'Regroup Captions'}</span>
          </button>

          {/* Milestone 5: AI Quality Analysis & Refinement */}
          <button
            onClick={() => runQualityAnalysis()}
            disabled={isAnalyzingQuality || project.captions.length === 0}
            title="Evaluate reading speed, safe area compliance & filler words"
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded font-medium transition"
          >
            <span>{isAnalyzingQuality ? 'Auditing...' : 'Quality Audit'}</span>
          </button>

          <button
            onClick={async () => {
              setIsRefining(true);
              await refineTranscript(true, true);
              setIsRefining(false);
            }}
            disabled={isRefining || allWords.length === 0}
            title="Clean up Hindi/English filler words and repeated stutters"
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-800/80 text-purple-300 rounded font-medium transition"
          >
            <span>{isRefining ? 'Refining...' : 'Refine Fillers'}</span>
          </button>

          {qualityReport && (
            <div className="flex items-center space-x-2 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-[11px]">
              <span className={`font-bold ${qualityReport.quality_score >= 90 ? 'text-emerald-400' : qualityReport.quality_score >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                Score: {qualityReport.quality_score}/100
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-mono">CPS: {qualityReport.average_cps}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-mono">WPM: {qualityReport.average_wpm}</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript words..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main split area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sentence / Word List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sentences.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">No transcript available in this project yet.</p>
              <p className="text-[11px] text-zinc-600">Switch to the Transcribe tab to import audio or run speech recognition.</p>
            </div>
          ) : (
            sentences.map((sentence, sIdx) => {
              const isSentenceActive =
                currentTime >= sentence.start && currentTime <= sentence.end;

              return (
                <div
                  key={sentence.sentence_id}
                  className={`p-3 rounded-xl border transition-all ${
                    isSentenceActive
                      ? 'border-blue-500/60 bg-blue-950/10'
                      : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  {/* Sentence Header */}
                  <div className="flex items-center justify-between mb-2 text-[10px] text-zinc-400">
                    <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                      Segment #{sIdx + 1} • {sentence.start.toFixed(2)}s - {sentence.end.toFixed(2)}s
                    </span>

                    <div className="flex items-center space-x-2">
                      <span className="text-zinc-500">{sentence.words.length} words</span>
                      {sIdx < sentences.length - 1 && (
                        <button
                          onClick={() => mergeSentences(sentence.sentence_id, sentences[sIdx + 1].sentence_id)}
                          title="Merge this segment with next segment"
                          className="flex items-center space-x-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition text-[10px]"
                        >
                          <Merge className="w-3 h-3 text-indigo-400" />
                          <span>Merge Next</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Words Container */}
                  <div className="flex flex-wrap gap-1.5 font-devanagari text-base">
                    {sentence.words.map((word) => {
                      const isWordPlaying =
                        currentTime >= word.start && currentTime <= word.end;
                      const isSelected = activeWordId === word.word_id;
                      const isEditing = editingWordId === word.word_id;
                      const matchesSearch =
                        searchQuery.trim() !== '' &&
                        word.text.toLowerCase().includes(searchQuery.toLowerCase().trim());

                      if (isEditing) {
                        return (
                          <div key={word.word_id} className="flex items-center space-x-1">
                            <input
                              type="text"
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(word.word_id);
                                if (e.key === 'Escape') setEditingWordId(null);
                              }}
                              className="bg-zinc-800 text-white px-2 py-0.5 rounded border border-blue-500 text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveEdit(word.word_id)}
                              className="p-1 bg-emerald-600 rounded text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <span
                          key={word.word_id}
                          onClick={() => handleWordClick(word)}
                          onDoubleClick={() => handleStartEdit(word)}
                          style={{
                            color: word.custom_color || undefined,
                          }}
                          className={`px-2 py-0.5 rounded cursor-pointer transition select-text ${
                            isWordPlaying
                              ? 'bg-amber-400 text-zinc-950 font-bold scale-105 shadow'
                              : isSelected
                              ? 'bg-blue-600 text-white font-medium ring-2 ring-blue-400'
                              : matchesSearch
                              ? 'bg-amber-500/30 text-amber-200 ring-1 ring-amber-400'
                              : 'hover:bg-zinc-800 text-zinc-200'
                          } ${word.corrected ? 'underline decoration-dotted decoration-blue-400' : ''}`}
                          title={`${word.text} (${word.start}s - ${word.end}s) • Double-click to edit`}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Word Properties Inspector Panel (Right) */}
        <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-4 space-y-4 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
            <span>Word Inspector</span>
            {activeWord && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevWord}
                  disabled={currentGlobalWordIdx <= 0}
                  title="Previous Word"
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-800"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={handleNextWord}
                  disabled={currentGlobalWordIdx === -1 || currentGlobalWordIdx >= allWords.length - 1}
                  title="Next Word"
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-800"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {activeWord ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Word Text</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={activeWord.text}
                    onChange={(e) => updateWordText(activeWord.word_id, e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 font-devanagari text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Start Time (s)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={activeWord.start}
                    onChange={(e) =>
                      updateWordTiming(activeWord.word_id, parseFloat(e.target.value) || 0, activeWord.end)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">End Time (s)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={activeWord.end}
                    onChange={(e) =>
                      updateWordTiming(activeWord.word_id, activeWord.start, parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                  />
                </div>
              </div>

              {/* Split Segment Action */}
              {activeSentence && activeWordIndex > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => splitSentence(activeSentence!.sentence_id, activeWordIndex)}
                    title="Split current sentence into two at this word"
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition"
                  >
                    <Split className="w-3.5 h-3.5 text-blue-400" />
                    <span>Split Segment Here</span>
                  </button>
                </div>
              )}

              {/* Word-level custom highlight color (PRD Section 9.2 Level 3) */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <label className="text-[10px] text-zinc-400 block">Word Highlight Color</label>
                <div className="flex items-center space-x-2">
                  {['#FFDF00', '#00FF66', '#38BDF8', '#F43F5E', '#FFFFFF'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setWordHighlightColor(activeWord.word_id, c)}
                      style={{ backgroundColor: c }}
                      className="w-5 h-5 rounded-full border border-zinc-700 hover:scale-110 transition shadow"
                    />
                  ))}
                  <button
                    onClick={() => setWordHighlightColor(activeWord.word_id, undefined)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 underline ml-1"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Duration:</span>
                  <span className="text-zinc-300 font-mono">
                    {(activeWord.end - activeWord.start).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Confidence:</span>
                  <span className="text-emerald-400 font-mono">
                    {activeWord.confidence ? `${Math.round(activeWord.confidence * 100)}%` : 'High'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Manual Edit:</span>
                  <span className="text-zinc-300">{activeWord.corrected ? 'Modified' : 'Original AI'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Click any word in the transcript to inspect and customize its timing, text, and styling.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
