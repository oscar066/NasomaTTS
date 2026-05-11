"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Volume2,
} from "lucide-react";
import type { Voice } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TTSOverlayProps {
  isPlaying: boolean;
  currentParagraphIndex: number;
  totalParagraphs: number;
  currentWordIndex: number;
  wordWindow: string[];
  windowStart: number;
  voice: string;
  voices: Voice[];
  speed: number;
  onPlay: () => void;
  onStop: () => void;
  onPrevParagraph: () => void;
  onNextParagraph: () => void;
  onVoiceChange: (v: string) => void;
  onSpeedChange: (s: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const TTSOverlay: React.FC<TTSOverlayProps> = ({
  isPlaying,
  currentParagraphIndex,
  totalParagraphs,
  currentWordIndex,
  wordWindow,
  windowStart,
  voice,
  voices,
  speed,
  onPlay,
  onStop,
  onPrevParagraph,
  onNextParagraph,
  onVoiceChange,
  onSpeedChange,
}) => {
  const [expanded, setExpanded] = useState(true);

  const progress = totalParagraphs > 0
    ? Math.round((currentParagraphIndex / totalParagraphs) * 100)
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-700">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Word focus strip — only when expanded and something is playing */}
      {expanded && (
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-center min-h-[72px]">
          {wordWindow.length > 0 ? (
            <div className="flex items-baseline gap-2 flex-wrap justify-center max-w-3xl">
              {wordWindow.map((word, i) => {
                const globalIdx = windowStart + i;
                const isCurrent = globalIdx === currentWordIndex;
                const isPast = globalIdx < currentWordIndex;
                return (
                  <span
                    key={i}
                    className={`transition-all duration-100 ${
                      isCurrent
                        ? "text-yellow-400 font-bold text-2xl scale-110"
                        : isPast
                        ? "text-gray-600 text-lg"
                        : "text-gray-300 text-lg"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {isPlaying ? "Starting…" : "Press play to begin reading"}
            </p>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div className="bg-gray-950 border-t border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Expand/collapse */}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 p-0 flex-shrink-0"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Button>

          {/* Nav + Play */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800 h-9 w-9 p-0"
              onClick={onPrevParagraph}
              disabled={currentParagraphIndex <= 0}
              title="Previous paragraph (←)"
            >
              <SkipBack size={18} />
            </Button>

            <Button
              onClick={isPlaying ? onStop : onPlay}
              className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-5 rounded-full font-semibold"
            >
              {isPlaying ? (
                <>
                  <Pause size={16} className="mr-2" /> Pause
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" /> Play
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800 h-9 w-9 p-0"
              onClick={onNextParagraph}
              disabled={currentParagraphIndex >= totalParagraphs - 1}
              title="Next paragraph (→)"
            >
              <SkipForward size={18} />
            </Button>
          </div>

          {/* Voice */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Volume2 size={14} className="text-gray-500" />
            <Select value={voice} onValueChange={onVoiceChange}>
              <SelectTrigger className="h-8 w-32 bg-gray-800 border-gray-700 text-gray-200 text-sm">
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm hover:bg-gray-700">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7 p-0 text-xs"
              onClick={() => {
                const idx = SPEEDS.indexOf(speed);
                if (idx > 0) onSpeedChange(SPEEDS[idx - 1]);
              }}
              disabled={speed <= SPEEDS[0]}
            >
              −
            </Button>
            <span className="text-gray-300 text-sm w-10 text-center font-mono">
              {speed}×
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7 p-0 text-xs"
              onClick={() => {
                const idx = SPEEDS.indexOf(speed);
                if (idx < SPEEDS.length - 1) onSpeedChange(SPEEDS[idx + 1]);
              }}
              disabled={speed >= SPEEDS[SPEEDS.length - 1]}
            >
              +
            </Button>
          </div>

          {/* Paragraph counter */}
          <span className="text-gray-500 text-xs flex-shrink-0 font-mono">
            {totalParagraphs > 0
              ? `§ ${currentParagraphIndex + 1} / ${totalParagraphs}`
              : "—"}
          </span>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-gray-700 text-xs mt-1.5 hidden sm:block">
          Space · play/pause &nbsp;·&nbsp; ← → · skip paragraph
        </p>
      </div>
    </div>
  );
};

export default TTSOverlay;
