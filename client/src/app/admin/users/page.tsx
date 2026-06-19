"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/app/components/Dashboard/SideBar";
import { TopBar } from "@/app/components/Dashboard/TopBar";
import { UsersTable } from "@/app/components/Dashboard/admin/components/UsersTable";
import { CreateUserModal } from "@/app/components/Dashboard/admin/components/CreateUserModal";
import { EditUserModal } from "@/app/components/Dashboard/admin/components/EditUserModal";
import { adminApi, type AdminUser } from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [users, setUsers]                     = useState<AdminUser[]>([]);
  const [total, setTotal]                     = useState(0);
  const [page, setPage]                       = useState(0);
  const [search, setSearch]                   = useState("");
  const [loadingUsers, setLoadingUsers]       = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser]         = useState<AdminUser | null>(null);

  const token = session?.accessToken ?? "";

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await adminApi.users(token, search, page * 20);
      setUsers(res.users);
      setTotal(res.total);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(0); }, [search]);

  const handleToggleActive = async (userId: string) => {
    if (!token) return;
    try {
      const updated = await adminApi.toggleActive(userId, token);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: updated.is_active } : u));
      toast.success(updated.is_active ? "User reinstated" : "User suspended");
    } catch (err: unknown) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleEditSaved = (updated: Pick<AdminUser, "id" | "plan" | "is_superuser">) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    toast.success("User updated");
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    if (!token) return;
    try {
      const updated = await adminApi.updatePlan(userId, plan, token);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: updated.plan } : u));
      toast.success(`Plan updated to ${updated.plan}`);
    } catch (err: unknown) {
      toast.error("Failed to update plan", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleResendVerification = async (userId: string) => {
    if (!token) return;
    try {
      await adminApi.resendVerification(userId, token);
      toast.success("Verification email sent");
    } catch (err: unknown) {
      toast.error("Failed to send email", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Users</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage all registered users
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white gap-2 flex-shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              New user
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>

            <UsersTable
              users={users}
              total={total}
              page={page}
              onPageChange={setPage}
              onToggleActive={handleToggleActive}
              onResendVerification={handleResendVerification}
              onUpdatePlan={handleUpdatePlan}
              onEdit={setEditingUser}
              loading={loadingUsers}
            />
          </div>
        </main>
      </div>

      {showCreateModal && (
        <CreateUserModal
          token={token}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          token={token}
          onClose={() => setEditingUser(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
