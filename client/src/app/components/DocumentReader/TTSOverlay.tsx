"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Mic,
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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

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

  const progress =
    totalParagraphs > 0
      ? Math.round((currentParagraphIndex / totalParagraphs) * 100)
      : 0;

  const speedIdx = SPEEDS.indexOf(speed);
  const canSlowDown = speedIdx > 0;
  const canSpeedUp = speedIdx < SPEEDS.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Reading progress bar */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Word focus strip */}
      {expanded && (
        <div className="bg-zinc-900 border-t border-white/5 px-6 py-3 flex items-center justify-center min-h-[68px]">
          {wordWindow.length > 0 ? (
            <div className="flex items-baseline gap-2 flex-wrap justify-center max-w-3xl">
              {wordWindow.map((word, i) => {
                const globalIdx = windowStart + i;
                const isCurrent = globalIdx === currentWordIndex;
                const isPast = globalIdx < currentWordIndex;
                return (
                  <span
                    key={i}
                    className={`transition-all duration-100 select-none ${
                      isCurrent
                        ? "text-primary font-bold text-2xl scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        : isPast
                        ? "text-zinc-600 text-base"
                        : "text-zinc-300 text-lg"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm select-none">
              {isPlaying ? "Starting…" : "Press play to begin listening"}
            </p>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div className="bg-zinc-950 border-t border-white/5 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">

          {/* Expand / collapse word strip */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 flex-shrink-0"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Hide word display" : "Show word display"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>

          {/* Playback controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10"
              onClick={onPrevParagraph}
              disabled={currentParagraphIndex <= 0}
              title="Previous paragraph"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <button
              onClick={isPlaying ? onStop : onPlay}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10"
              onClick={onNextParagraph}
              disabled={currentParagraphIndex >= totalParagraphs - 1}
              title="Next paragraph"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Voice selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Mic className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <Select value={voice} onValueChange={onVoiceChange}>
              <SelectTrigger className="h-7 w-36 bg-white/5 border-white/10 text-zinc-200 text-xs hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                {voices.map((v) => (
                  <SelectItem
                    key={v.id}
                    value={v.id}
                    className="text-xs hover:bg-white/10 focus:bg-white/10"
                  >
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 text-sm font-bold"
              onClick={() => canSlowDown && onSpeedChange(SPEEDS[speedIdx - 1])}
              disabled={!canSlowDown}
            >
              −
            </Button>
            <span className="text-zinc-200 text-xs font-mono w-10 text-center tabular-nums">
              {speed}×
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 text-sm font-bold"
              onClick={() => canSpeedUp && onSpeedChange(SPEEDS[speedIdx + 1])}
              disabled={!canSpeedUp}
            >
              +
            </Button>
          </div>

          {/* Progress counter */}
          <span className="text-zinc-500 text-xs font-mono flex-shrink-0 tabular-nums hidden sm:block">
            {totalParagraphs > 0
              ? `${currentParagraphIndex + 1} / ${totalParagraphs}`
              : "—"}
          </span>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-zinc-700 text-[10px] mt-1.5 hidden sm:block select-none">
          Space · play/pause &nbsp;·&nbsp; ← → · skip paragraph
        </p>
      </div>
    </div>
  );
};

export default TTSOverlay;
