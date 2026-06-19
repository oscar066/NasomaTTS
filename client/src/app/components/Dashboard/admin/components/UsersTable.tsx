import React from "react";
import { CheckCircle2, XCircle, ShieldAlert, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/api";

interface UsersTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  onToggleActive: (id: string) => void;
  onResendVerification: (id: string) => void;
  onUpdatePlan: (id: string, plan: string) => void;
  onEdit: (user: AdminUser) => void;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function UsersTable({
  users,
  total,
  page,
  onPageChange,
  onToggleActive,
  onResendVerification,
  onUpdatePlan,
  onEdit,
  loading,
}: UsersTableProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">
          Users <span className="text-muted-foreground font-normal text-sm">({total})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Docs</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50" : ""}>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.username?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground leading-tight">
                        {user.username}
                        {user.is_superuser && (
                          <ShieldAlert className="inline h-3.5 w-3.5 text-primary ml-1.5 -mt-0.5" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${user.plan === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {user.plan}
                  </span>
                </td>

                <td className="px-5 py-3 text-muted-foreground">{user.doc_count}</td>

                <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(user.joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {user.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        <XCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                    {!user.is_active && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                        <XCircle className="h-3 w-3" /> Suspended
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Edit plan and role */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => onEdit(user)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>

                    {/* Resend verification for unverified non-superusers */}
                    {!user.is_verified && !user.is_superuser && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1"
                        onClick={() => onResendVerification(user.id)}
                      >
                        <Mail className="h-3 w-3" />
                        Resend
                      </Button>
                    )}
                    {/* Suspend / reinstate for non-superusers */}
                    {!user.is_superuser && (
                      <Button
                        size="sm"
                        variant={user.is_active ? "outline" : "default"}
                        className={`text-xs h-7 ${!user.is_active ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : "text-destructive border-destructive/30 hover:bg-destructive/10"}`}
                        onClick={() => onToggleActive(user.id)}
                      >
                        {user.is_active ? "Suspend" : "Reinstate"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
