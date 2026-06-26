"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Medal,
  BookOpen,
  CheckCircle2,
  FileText,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Sidebar from "../Dashboard/SideBar";
import { TopBar } from "../Dashboard/TopBar";
import { leaderboardApi, type LeaderboardEntry } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatWords(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function Avatar({ username, avatar, size = "md" }: { username: string; avatar?: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14 text-xl" : size === "md" ? "h-10 w-10 text-base" : "h-8 w-8 text-xs";
  if (avatar) {
    return <img src={avatar} alt={username} className={`${dims} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dims} rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center flex-shrink-0`}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan !== "pro") return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
      <Crown className="h-2.5 w-2.5" />
      Pro
    </span>
  );
}

const RANK_STYLES: Record<number, { bg: string; border: string; icon: string }> = {
  1: { bg: "bg-yellow-500/10", border: "border-yellow-500/40", icon: "text-yellow-500" },
  2: { bg: "bg-slate-400/10",  border: "border-slate-400/40",  icon: "text-slate-400"  },
  3: { bg: "bg-amber-600/10",  border: "border-amber-600/40",  icon: "text-amber-600"  },
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

const PLATFORM_HEIGHT: Record<number, string> = {
  1: "h-16",
  2: "h-10",
  3: "h-6",
};

const PLATFORM_COLOR: Record<number, string> = {
  1: "bg-yellow-500/30 border-yellow-500/40",
  2: "bg-slate-400/20 border-slate-400/30",
  3: "bg-amber-600/20 border-amber-600/30",
};

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const style = RANK_STYLES[entry.rank];
  const isFirst = entry.rank === 1;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`
          w-full flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all
          ${style.bg} ${style.border}
          ${entry.is_me ? "ring-2 ring-primary/50" : ""}
        `}
      >
        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${style.bg} border ${style.border}`}>
          <RankIcon rank={entry.rank} />
        </div>

        <Avatar username={entry.username} avatar={entry.avatar} size={isFirst ? "lg" : "md"} />

        <div className="text-center">
          <p className={`font-bold ${isFirst ? "text-base" : "text-sm"} truncate max-w-[120px]`}>
            {entry.username}
            {entry.is_me && <span className="ml-1 text-[10px] text-primary font-semibold">(you)</span>}
          </p>
          <div className="mt-0.5 flex items-center justify-center gap-1">
            <PlanBadge plan={entry.plan} />
          </div>
        </div>

        <div className="flex flex-col items-center rounded-lg bg-muted/50 p-3 w-full mt-1">
          <BookOpen className="h-4 w-4 text-primary mb-1" />
          <span className="text-2xl font-bold">{formatWords(entry.total_words)}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Words read</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground w-full justify-center">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {entry.finished_count} finished
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {entry.doc_count} uploaded
          </span>
        </div>
      </div>

      {/* Platform step */}
      <div
        className={`w-full rounded-b-xl border-x border-b ${PLATFORM_HEIGHT[entry.rank]} ${PLATFORM_COLOR[entry.rank]}`}
      />
    </div>
  );
}

function TableRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
        ${entry.is_me
          ? "bg-primary/5 border border-primary/20"
          : "hover:bg-secondary/60 border border-transparent"}
      `}
    >
      <div className="w-6 flex-shrink-0 flex justify-center">
        <RankIcon rank={entry.rank} />
      </div>

      <Avatar username={entry.username} avatar={entry.avatar} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {entry.username}
          {entry.is_me && <span className="ml-1.5 text-[10px] text-primary font-semibold">(you)</span>}
        </p>
        <PlanBadge plan={entry.plan} />
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold w-24 justify-end">
        <BookOpen className="h-3 w-3 text-primary" />
        {formatWords(entry.total_words)}
        <span className="text-muted-foreground font-normal">words</span>
      </div>

      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground w-28 justify-end">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        {entry.finished_count} finished
      </div>
    </div>
  );
}


export default function Leaderboard() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { router.push("/auth/login"); },
  });

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    leaderboardApi.get(session.accessToken).then((data) => {
      setEntries(data.entries);
      setMe(data.me);
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    }).finally(() => setLoading(false));
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold">Leaderboard</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              See how you stack up against other readers. Finish more books to climb the ranks.
            </p>
          </div>

          {loading && (
            <div className="space-y-4">
              <div className="flex items-end gap-4 justify-center max-w-2xl mx-auto mb-8">
                {[80, 100, 60].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <Skeleton className="w-full rounded-2xl" style={{ height: 260 }} />
                    <Skeleton className={`w-full rounded-b-xl`} style={{ height: h * 0.4 }} />
                  </div>
                ))}
              </div>
              <Card>
                <CardContent className="p-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No rankings yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Upload and finish your first document to claim the top spot!
              </p>
            </div>
          )}

          {!loading && !error && me && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="flex flex-col items-center bg-primary/10 rounded-lg px-3 py-1.5 flex-shrink-0">
                <span className="text-lg font-bold text-primary leading-none">#{me.rank}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Your rank</span>
              </div>
              <Avatar username={me.username} avatar={me.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{me.username}</p>
                <p className="text-xs text-muted-foreground">
                  {me.finished_count} finished · {me.doc_count} uploaded · {formatWords(me.total_words)} words
                </p>
              </div>
              <p className="hidden sm:block text-xs text-muted-foreground italic">Keep reading to climb the board!</p>
            </CardContent>
            </Card>
          )}

          {!loading && !error && entries.length > 0 && (
            <>
              {top3.length > 0 && (
                <div className="mb-8">
                  <div
                    className={`
                      flex items-end gap-4 justify-center
                      ${top3.length === 1 ? "max-w-xs mx-auto" : ""}
                      ${top3.length === 2 ? "max-w-md mx-auto" : ""}
                      ${top3.length === 3 ? "max-w-2xl mx-auto" : ""}
                    `}
                  >
                    {(top3.length === 3 ? podiumOrder : top3).map((e) => (
                      <div key={e.user_id} className="flex-1 min-w-0">
                        <PodiumCard entry={e} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rest.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="ml-9">Reader</span>
                      <div className="flex items-center gap-6 pr-1">
                        <span className="w-24 text-right">Words read</span>
                        <span className="hidden sm:block w-28 text-right">Finished</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="px-2 py-2 space-y-0.5">
                    {rest.map((e) => <TableRow key={e.user_id} entry={e} />)}
                  </CardContent>
                </Card>
              )}

            </>
          )}
        </main>
      </div>
    </div>
  );
}