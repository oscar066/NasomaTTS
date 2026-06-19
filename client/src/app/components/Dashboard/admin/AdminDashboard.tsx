"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "../SideBar";
import { TopBar } from "../TopBar";
import { StatsCards } from "./components/StatsCards";
import { adminApi, type AdminStats, type AdminUser } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const token = session?.accessToken ?? "";

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try { setStats(await adminApi.stats(token)); } catch {}
  }, [token]);

  const fetchRecentUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await adminApi.users(token, "", 0);
      const sorted = [...res.users].sort(
        (a, b) => new Date(b.joined ?? 0).getTime() - new Date(a.joined ?? 0).getTime()
      );
      setRecentUsers(sorted.slice(0, 5));
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRecentUsers(); }, [fetchRecentUsers]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(o => !o)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of your application and users</p>
          </div>

          <StatsCards stats={stats} />

          {/* Recent users */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Recent Users</h2>
              <button
                onClick={() => router.push("/admin/users")}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No users yet.</p>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium leading-none">{u.username}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.plan === "pro"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {u.plan === "pro" ? "Pro" : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            u.is_active ? "text-green-600" : "text-destructive"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-destructive"}`} />
                            {u.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.joined ? timeAgo(u.joined) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
