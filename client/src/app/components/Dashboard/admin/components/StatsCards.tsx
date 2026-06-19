import React from "react";
import { Users, FileText, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import type { AdminStats } from "@/lib/api";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function StatsCards({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard icon={Users}        label="Total Users"      value={stats?.total_users ?? 0}         color="bg-primary"    sub={`${stats?.new_users_this_week ?? 0} new this week`} />
      <StatCard icon={FileText}     label="Total Documents"  value={stats?.total_documents ?? 0}     color="bg-violet-500" sub={`${stats?.new_docs_this_week ?? 0} new this week`} />
      <StatCard icon={TrendingUp}   label="New Users (7d)"   value={stats?.new_users_this_week ?? 0} color="bg-emerald-500" />
      <StatCard icon={CheckCircle2} label="Verified Users"   value={stats?.verified_users ?? 0}      color="bg-sky-500"    />
      <StatCard icon={XCircle}      label="Unverified Users" value={stats?.unverified_users ?? 0}    color="bg-amber-500"  />
      <StatCard icon={FileText}     label="New Docs (7d)"    value={stats?.new_docs_this_week ?? 0}  color="bg-rose-500"   />
    </div>
  );
}
