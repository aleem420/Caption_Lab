import React, { useState } from 'react';
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
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { WordItem } from '../../types';

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
  } = useProjectStore();

  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const sentences = project.transcript.sentences || [];

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

  const activeWord = project.transcript.sentences
    .flatMap((s) => s.words)
    .find((w) => w.word_id === activeWordId);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
      {/* Top Toolbar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <div className="font-mono text-zinc-300 text-xs flex items-center space-x-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>{currentTime.toFixed(2)}s</span>
          </div>
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
          {sentences.map((sentence, sIdx) => {
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
                  </div>
                </div>

                {/* Words Container */}
                <div className="flex flex-wrap gap-1.5 font-devanagari text-base">
                  {sentence.words.map((word) => {
                    const isWordPlaying =
                      currentTime >= word.start && currentTime <= word.end;
                    const isSelected = activeWordId === word.word_id;
                    const isEditing = editingWordId === word.word_id;

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
                            : 'hover:bg-zinc-800 text-zinc-200'
                        } ${word.corrected ? 'underline decoration-dotted decoration-blue-400' : ''}`}
                        title={`${word.text} (${word.start}s - ${word.end}s)`}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Word Properties Inspector Panel (Right) */}
        <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-4 space-y-4 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
            <span>Word Inspector</span>
            {activeWord && (
              <span className="text-[10px] text-zinc-400 font-mono">{activeWord.word_id}</span>
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
                      updateWordTiming(activeWord.word_id, parseFloat(e.target.value), activeWord.end)
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
                      updateWordTiming(activeWord.word_id, activeWord.start, parseFloat(e.target.value))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                  />
                </div>
              </div>

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
              Click any word in the transcript to inspect and customize its timing and styling.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
