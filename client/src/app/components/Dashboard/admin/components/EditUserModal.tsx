"use client";

import React, { useState } from "react";
import { X, UserCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminApi, type AdminUser } from "@/lib/api";

interface EditUserModalProps {
  user: AdminUser;
  token: string;
  onClose: () => void;
  onSaved: (updated: Pick<AdminUser, "id" | "plan" | "is_superuser">) => void;
}

export function EditUserModal({ user, token, onClose, onSaved }: EditUserModalProps) {
  const [plan, setPlan]             = useState<"free" | "pro">(user.plan as "free" | "pro");
  const [role, setRole]             = useState<"user" | "admin">(user.is_superuser ? "admin" : "user");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const planChanged = plan !== user.plan;
  const roleChanged = (role === "admin") !== user.is_superuser;
  const hasChanges  = planChanged || roleChanged;

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setError(null);
    setLoading(true);
    try {
      await adminApi.editUser(token, user.id, {
        plan,
        is_superuser: role === "admin",
      });
      onSaved({ id: user.id, plan, is_superuser: role === "admin" });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Edit user</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* User summary */}
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.username?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Plan */}
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <div className="flex gap-3">
              {(["free", "pro"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    plan === p
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {plan === "pro"
                ? "Full access to Pro features."
                : "Limited to free tier features."}
            </p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex gap-3">
              {(["user", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    role === r
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? "Admin users have full access to this dashboard."
                : "Standard users can only access their own library."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
