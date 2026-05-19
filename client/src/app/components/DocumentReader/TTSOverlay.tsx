"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic,
  ChevronUp,
  ChevronDown,
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

  const speedIdx  = SPEEDS.indexOf(speed);
  const canSlower = speedIdx > 0;
  const canFaster = speedIdx < SPEEDS.length - 1;

  const progress =
    totalParagraphs > 0
      ? ((currentParagraphIndex + 1) / totalParagraphs) * 100
      : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
      {/* ── Progress bar ──────────────────────────────────────── */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Word focus strip (collapsible) ────────────────────── */}
      {expanded && (
        <div className="bg-zinc-900 min-h-[68px] flex items-center justify-center px-4 py-3 overflow-hidden">
          {wordWindow.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap justify-center max-w-3xl">
              {wordWindow.map((word, i) => {
                const absoluteIdx = windowStart + i;
                const isCurrent = absoluteIdx === currentWordIndex;
                const isPast    = absoluteIdx < currentWordIndex;
                return (
                  <span
                    key={i}
                    className={`
                      transition-all duration-75 select-none
                      ${isCurrent
                        ? "text-primary font-bold text-2xl scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        : isPast
                        ? "text-zinc-600 text-lg"
                        : "text-zinc-300 text-lg"
                      }
                    `}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm italic">
              {isPlaying ? "Synthesising…" : "Press play to start reading"}
            </p>
          )}
        </div>
      )}

      {/* ── Controls bar ──────────────────────────────────────── */}
      <div className="bg-zinc-950 border-t border-white/5 h-16">
        <div className="h-full max-w-4xl mx-auto px-4 flex items-center justify-between gap-3">

          {/* Playback */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={onPrevParagraph}
              disabled={currentParagraphIndex <= 0}
              title="Previous paragraph (←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <button
              onClick={isPlaying ? onStop : onPlay}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 hover:opacity-90 text-white flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying
                ? <Pause className="h-4 w-4" />
                : <Play  className="h-4 w-4 ml-0.5" />
              }
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={onNextParagraph}
              disabled={currentParagraphIndex >= totalParagraphs - 1}
              title="Next paragraph (→)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Voice selector */}
          <div className="flex items-center gap-2">
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

          {/* Speed */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 font-bold text-base"
              onClick={() => canSlower && onSpeedChange(SPEEDS[speedIdx - 1])}
              disabled={!canSlower}
            >
              −
            </Button>
            <span className="text-zinc-200 text-xs font-mono w-10 text-center tabular-nums">
              {speed}×
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 font-bold text-base"
              onClick={() => canFaster && onSpeedChange(SPEEDS[speedIdx + 1])}
              disabled={!canFaster}
            >
              +
            </Button>
          </div>

          {/* Progress counter + expand toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-zinc-500 text-xs font-mono tabular-nums hidden sm:block">
              {totalParagraphs > 0
                ? `${Math.max(1, currentParagraphIndex + 1)} / ${totalParagraphs}`
                : "—"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/10"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse word strip" : "Expand word strip"}
            >
              {expanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronUp   className="h-3.5 w-3.5" />
              }
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TTSOverlay;
