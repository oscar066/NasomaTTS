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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* ── Progress bar ────────────────────────────────────── */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Word focus strip (collapsible) ──────────────────── */}
        {expanded && (
          <div className="bg-muted/40 min-h-[60px] flex items-center justify-center px-6 py-3 border-b border-border/60 overflow-hidden">
            {wordWindow.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap justify-center">
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
                          ? "text-primary font-bold text-xl scale-110 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]"
                          : isPast
                          ? "text-muted-foreground/50 text-base"
                          : "text-foreground/80 text-base"
                        }
                      `}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {isPlaying ? "Synthesising…" : "Press play to start reading"}
              </p>
            )}
          </div>
        )}

        {/* ── Controls bar ────────────────────────────────────── */}
        <div className="h-14 px-3 grid grid-cols-3 items-center">

          {/* Left — Voice selector */}
          <div className="flex items-center gap-1.5">
            <Mic className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <Select value={voice} onValueChange={onVoiceChange}>
              <SelectTrigger className="h-7 w-32 text-xs bg-secondary/60 border-border focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v, i) => (
                  <SelectItem key={`${v.id}-${i}`} value={v.id} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Center — Playback */}
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onPrevParagraph}
              disabled={currentParagraphIndex <= 0}
              title="Previous paragraph (←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <button
              onClick={isPlaying ? onStop : onPlay}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 hover:opacity-90 text-white flex items-center justify-center shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying
                ? <Pause className="h-3.5 w-3.5" />
                : <Play  className="h-3.5 w-3.5 ml-0.5" />
              }
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onNextParagraph}
              disabled={currentParagraphIndex >= totalParagraphs - 1}
              title="Next paragraph (→)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Right — Speed + progress + collapse */}
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground font-bold text-base"
              onClick={() => canSlower && onSpeedChange(SPEEDS[speedIdx - 1])}
              disabled={!canSlower}
            >
              −
            </Button>
            <span className="text-foreground text-xs font-mono w-9 text-center tabular-nums">
              {speed}×
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground font-bold text-base"
              onClick={() => canFaster && onSpeedChange(SPEEDS[speedIdx + 1])}
              disabled={!canFaster}
            >
              +
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand word strip"}
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
