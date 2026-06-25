"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Headphones,
  Volume2,
  SkipBack,
  SkipForward,
  ChevronDown,
  Lock,
  Search,
} from "lucide-react";
import type { Voice } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UpgradeModal from "@/components/ui/UpgradeModal";

// One distinct colour per Kokoro voice — drives the avatar circle
const VOICE_COLORS: Record<string, string> = {
  // American · Female
  sophia:   "bg-rose-400",
  luna:     "bg-violet-400",
  aria:     "bg-purple-400",
  bella:    "bg-pink-400",
  zara:     "bg-orange-400",
  iris:     "bg-emerald-400",
  nina:     "bg-fuchsia-400",
  nova:     "bg-amber-400",
  river:    "bg-teal-400",
  sarah:    "bg-red-400",
  sky:      "bg-sky-400",
  // American · Male
  oscar:    "bg-blue-500",
  echo:     "bg-slate-500",
  eli:      "bg-orange-500",
  thor:     "bg-indigo-500",
  liam:     "bg-cyan-600",
  max:      "bg-green-500",
  onyx:     "bg-zinc-600",
  rex:      "bg-yellow-500",
  // British · Female
  alice:    "bg-lime-500",
  emma:     "bg-rose-600",
  isabella: "bg-purple-500",
  lily:     "bg-pink-600",
  // British · Male
  daniel:   "bg-blue-700",
  fable:    "bg-amber-600",
  george:   "bg-teal-600",
  lewis:    "bg-indigo-700",
};

const avatarColor = (id: string) => VOICE_COLORS[id] ?? "bg-muted-foreground/40";

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
  totalWordCount?: number | null;
  skipUnit?: "page" | "paragraph";
  aiPanelOpen?: boolean;
  userPlan?: string;
  onPlay: () => void;
  onStop: () => void;
  onPrevParagraph: () => void;
  onNextParagraph: () => void;
  onVoiceChange: (v: string) => void;
  onSpeedChange: (s: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const GROUP_ORDER = ["American", "British", "Other"];
const GROUP_FLAG: Record<string, string> = { American: "🇺🇸", British: "🇬🇧" };

// Base WPM the backend uses (150 wpm at 1× speed); actual rate scales linearly.
const BASE_WPM = 150;

function fmtDuration(minutes: number): string {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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
  totalWordCount,
  skipUnit = "paragraph",
  aiPanelOpen = false,
  userPlan = "free",
  onPlay,
  onStop,
  onPrevParagraph,
  onNextParagraph,
  onVoiceChange,
  onSpeedChange,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isPro = userPlan === "pro";

  useEffect(() => {
    if (voiceOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [voiceOpen]);

  const handleVoiceChange = (id: string, tier?: string) => {
    if (!isPro && tier === "premium") { setShowUpgrade(true); return; }
    onVoiceChange(id);
    setVoiceOpen(false);
  };

  const progress =
    totalParagraphs > 0
      ? ((currentParagraphIndex + 1) / totalParagraphs) * 100
      : 0;

  const wpm = BASE_WPM * speed;
  const totalMinutes  = totalWordCount ? totalWordCount / wpm : null;
  const elapsedMinutes = totalMinutes !== null ? (progress / 100) * totalMinutes : null;

  const selectedVoice = voices.find((v) => v.id === voice);

  const premium  = voices.filter((v) => v.tier === "premium");
  const standard = voices.filter((v) => v.tier !== "premium");

  const premiumGroups: Record<string, Voice[]> = {};
  for (const v of premium) {
    const g = v.group ?? "Other";
    (premiumGroups[g] ??= []).push(v);
  }

  return (
    <>
    <div
      className="-translate-x-1/2 fixed bottom-5 z-[60] w-full max-w-2xl px-4"
      style={{
        left: aiPanelOpen ? "calc(50% + min(224px, 50vw))" : "50%",
        transition: "left 300ms ease-in-out",
      }}
    >
      <div className="rounded-xl border border-border bg-muted shadow-md overflow-hidden">

        {/* Word focus strip */}
        {expanded && (
          <div className="min-h-[64px] flex items-center justify-center px-6 py-3 overflow-hidden">
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
                          ? "text-primary font-bold text-xl scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                          : isPast
                          ? "text-muted-foreground/40 text-base"
                          : "text-foreground/70 text-base"
                        }
                      `}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ) : isPlaying ? (
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/60 text-sm">
                Press play to start reading
              </p>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time estimate row */}
        {totalMinutes !== null && (
          <div className="flex items-center justify-between px-4 pt-1.5 pb-0">
            <span className="text-[11px] tabular-nums font-bold text-muted-foreground">
              {elapsedMinutes !== null ? fmtDuration(elapsedMinutes) : "0 min"}
            </span>
            <span className="text-[11px] tabular-nums font-bold text-muted-foreground">
              {fmtDuration(totalMinutes)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="h-14 px-3 flex items-center justify-center">

          {/* Center cluster — voice · prev · play · next · speed */}
          <div className="flex items-center gap-10">

            {/* Voice picker */}
            <DropdownMenu open={voiceOpen} onOpenChange={(o) => { setVoiceOpen(o); if (!o) setVoiceSearch(""); }}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-secondary border border-border text-xs hover:bg-muted transition-colors focus:outline-none">
                  <div className={`w-4 h-4 rounded-full ${avatarColor(voice)} flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0`}>
                    {(selectedVoice?.label ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="max-w-[64px] truncate">
                    {selectedVoice?.label ?? "Voice"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-72 p-2 z-[70]"
              >
                {/* Search input */}
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    value={voiceSearch}
                    onChange={(e) => setVoiceSearch(e.target.value)}
                    placeholder="Search voices…"
                    className="w-full pl-6 pr-2 py-1 text-xs rounded-md bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {voiceSearch.trim() ? (
                  /* ── Flat search results ── */
                  (() => {
                    const q = voiceSearch.toLowerCase();
                    const results = voices.filter((v) => v.label.toLowerCase().includes(q));
                    if (results.length === 0) return (
                      <p className="text-center text-[11px] text-muted-foreground py-4">No voices found</p>
                    );
                    return (
                      <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                        {results.map((v) => {
                          const isPremium = v.tier === "premium";
                          return (
                            <button
                              key={v.id}
                              onClick={() => handleVoiceChange(v.id, v.tier)}
                              className={`w-full flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-colors ${
                                voice === v.id
                                  ? "bg-primary/15 text-primary"
                                  : "text-foreground hover:bg-secondary"
                              } ${isPremium && !isPro ? "opacity-60" : ""}`}
                            >
                              <div className={`w-5 h-5 rounded-full ${avatarColor(v.id)} flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0`}>
                                {isPremium && !isPro ? <Lock className="h-2.5 w-2.5" /> : v.label[0]}
                              </div>
                              <span className="flex-1 text-left truncate">{v.label}</span>
                              {isPremium && (
                                <span className="text-[9px] text-primary/70 font-semibold flex-shrink-0">✦ Pro</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  /* ── Normal grouped view ── */
                  <>
                    <div className="max-h-44 overflow-y-auto pr-0.5">
                      <p className="sticky top-0 text-[10px] font-semibold text-primary mb-1 px-1 py-0.5 flex items-center gap-1 bg-popover z-10">
                        <span>✦</span><span>Premium</span>
                        {!isPro && <Lock className="h-2.5 w-2.5 ml-auto text-muted-foreground" />}
                      </p>
                      {GROUP_ORDER.filter((g) => premiumGroups[g]).map((g) => (
                        <div key={g} className="mb-2 last:mb-0">
                          <p className="text-[10px] text-muted-foreground mb-1 px-1 flex items-center gap-1">
                            {GROUP_FLAG[g] ?? ""} {g}
                          </p>
                          <div className="grid grid-cols-5 gap-1">
                            {premiumGroups[g].map((v) => (
                              <button
                                key={v.id}
                                onClick={() => handleVoiceChange(v.id, "premium")}
                                title={!isPro ? "Upgrade to Pro to use premium voices" : v.label}
                                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all relative ${
                                  voice === v.id
                                    ? "bg-primary/15 ring-1 ring-primary/50"
                                    : "hover:bg-secondary/70"
                                } ${!isPro ? "opacity-60" : ""}`}
                              >
                                <div className={`w-8 h-8 rounded-full ${avatarColor(v.id)} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                                  {!isPro ? <Lock className="h-3 w-3" /> : v.label[0]}
                                </div>
                                <span className="text-[9px] text-foreground/80 leading-tight w-full text-center truncate px-0.5">
                                  {v.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {standard.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-border">
                        <p className="text-[10px] font-semibold text-primary mb-1 px-1">
                          Standard
                        </p>
                        <div className="max-h-24 overflow-y-auto space-y-0.5 pr-0.5">
                          {standard.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => { onVoiceChange(v.id); setVoiceOpen(false); }}
                              className={`w-full text-left text-xs px-2 py-0.5 rounded-md transition-colors ${
                                voice === v.id
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Playback — prev · play · next kept tight together */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onPrevParagraph}
                disabled={currentParagraphIndex <= 0}
                title={`Previous ${skipUnit} (←)`}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <div className="relative flex items-center justify-center">
                {(!isPlaying && voices.length === 0) && (
                  <span
                    className="absolute rounded-full border-2 border-primary/60 border-t-transparent animate-spin pointer-events-none"
                    style={{ inset: "-5px" }}
                  />
                )}
                <button
                  onClick={isPlaying ? onStop : onPlay}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 hover:opacity-90 text-white flex items-center justify-center shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying
                    ? <Volume2     className="h-4 w-4" />
                    : <Headphones  className="h-4 w-4" />
                  }
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onNextParagraph}
                disabled={currentParagraphIndex >= totalParagraphs - 1}
                title={`Next ${skipUnit} (→)`}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed */}
            <DropdownMenu open={speedOpen} onOpenChange={setSpeedOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center h-7 px-2.5 rounded-md bg-secondary border border-border text-xs font-semibold tabular-nums hover:bg-muted transition-colors focus:outline-none">
                  {speed}×
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" sideOffset={8} className="p-2 z-[70]">
                <p className="text-[10px] font-semibold text-primary mb-2 px-1">Speed</p>
                <div className="grid grid-cols-3 gap-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { onSpeedChange(s); setSpeedOpen(false); }}
                      className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all ${
                        speed === s
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/60 text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-xs font-semibold tabular-nums leading-tight">{s}×</span>
                      <span className={`text-[9px] tabular-nums leading-tight ${speed === s ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {Math.round(150 * s)}wpm
                      </span>
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>{/* end center cluster */}

        </div>
      </div>
    </div>

    <UpgradeModal
      open={showUpgrade}
      onClose={() => setShowUpgrade(false)}
      title="Premium voices"
      description="Upgrade to Pro to access 28 natural AI voices powered by Kokoro."
    />
    </>
  );
};

export default TTSOverlay;
