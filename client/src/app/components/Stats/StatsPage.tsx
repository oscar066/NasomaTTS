"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";
import Sidebar from "../Dashboard/SideBar";
import { TopBar } from "../Dashboard/TopBar";
import { statsApi, type ActivityDay } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── helpers

function formatWords(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

function shortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── bar chart

interface BarChartProps {
  days: ActivityDay[];
  labelFn: (d: ActivityDay, i: number, arr: ActivityDay[]) => string | null;
}

function BarChart({ days, labelFn }: BarChartProps) {
  const max = Math.max(...days.map((d) => d.words_read), 1);
  const today = new Date().toISOString().slice(0, 10);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full">
      {/* Bars */}
      <div className="flex items-end gap-1 h-40 px-1">
        {days.map((d, i) => {
          const pct = (d.words_read / max) * 100;
          const isToday = d.date === today;
          const isHovered = hovered === i;
          return (
            <div
              key={d.date}
              className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && d.words_read > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap bg-foreground text-background text-[11px] font-medium px-2 py-1 rounded-md pointer-events-none">
                  {formatWords(d.words_read)} words
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              )}
              {/* Bar */}
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  d.words_read === 0
                    ? "bg-muted/60"
                    : isToday
                    ? "bg-gradient-to-t from-primary to-purple-500"
                    : isHovered
                    ? "bg-primary/80"
                    : "bg-primary/60"
                }`}
                style={{ height: `${Math.max(pct, d.words_read > 0 ? 3 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex items-start gap-1 mt-1.5 px-1">
        {days.map((d, i, arr) => {
          const label = labelFn(d, i, arr);
          return (
            <div key={d.date} className="flex-1 text-center">
              {label && (
                <span className={`text-[10px] text-muted-foreground ${d.date === today ? "font-semibold text-primary" : ""}`}>
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── summary strip

function SummaryStrip({ total, days, label }: { total: number; days: number; label: string }) {
  const daysWithActivity = days;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold">{formatWords(total)}</span>
      <span className="text-sm text-muted-foreground">words {label}</span>
      {daysWithActivity > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">
          {daysWithActivity} active day{daysWithActivity !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ── skeleton

const SKELETON_HEIGHTS = [35, 60, 45, 80, 55, 70, 40];

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
        <div className="flex items-end gap-1 h-40 px-1">
          {SKELETON_HEIGHTS.map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex gap-1 mt-1.5 px-1">
          {SKELETON_HEIGHTS.map((_, i) => (
            <Skeleton key={i} className="flex-1 h-3 mt-1" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── main page

type View = "week" | "month";

export default function StatsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { router.push("/auth/login"); },
  });

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [days, setDays] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("week");

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    statsApi.activity(session.accessToken)
      .then((data) => setDays(data.days))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load activity"))
      .finally(() => setLoading(false));
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const weekDays  = days.slice(-7);
  const monthDays = days;

  const weekTotal  = weekDays.reduce((a, d) => a + d.words_read, 0);
  const monthTotal = monthDays.reduce((a, d) => a + d.words_read, 0);

  const activeDays = (subset: ActivityDay[]) => subset.filter((d) => d.words_read > 0).length;

  const displayDays  = view === "week" ? weekDays : monthDays;
  const displayTotal = view === "week" ? weekTotal : monthTotal;
  const displayActive = activeDays(displayDays);

  // Label function: weekly shows every day, monthly shows every ~5th
  const weekLabelFn = (d: ActivityDay) => shortDay(d.date);
  const monthLabelFn = (_d: ActivityDay, i: number) => (i % 5 === 0 ? shortDate(_d.date) : null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">My Stats</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Words you've actually read, tracked daily.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <ChartSkeleton />
          ) : (
            <Card>
              <CardContent className="p-5">
                {/* Toggle */}
                <div className="flex items-center justify-between mb-5">
                  <SummaryStrip
                    total={displayTotal}
                    days={displayActive}
                    label={view === "week" ? "this week" : "this month"}
                  />
                  <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 flex-shrink-0">
                    {(["week", "month"] as View[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          view === v
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {v === "week" ? "7D" : "30D"}
                      </button>
                    ))}
                  </div>
                </div>

                <BarChart
                  days={displayDays}
                  labelFn={view === "week" ? weekLabelFn : monthLabelFn}
                />
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
