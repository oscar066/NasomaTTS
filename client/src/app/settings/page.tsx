"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Settings,
  Lock,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/app/components/Dashboard/SideBar";
import { TopBar } from "@/app/components/Dashboard/TopBar";

type Tab = "profile" | "account";

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}

function SettingsContent() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );

  const initialTab = (searchParams.get("tab") as Tab) ?? "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (status !== "loading" && status !== "authenticated")
      router.push("/auth/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "account", label: "Account Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your profile and account preferences
              </p>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 border-b border-border mb-8">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "profile" && <ProfileTab session={session} />}
            {activeTab === "account" && <AccountTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProfileTab({
  session,
}: {
  session: ReturnType<typeof useSession>["data"];
}) {
  const [username, setUsername] = useState(session?.user?.name ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to profile update API
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (session?.user?.email?.[0]?.toUpperCase() ?? "U");

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold select-none flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-medium">
            {session?.user?.name ?? session?.user?.email}
          </p>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={session?.user?.email ?? ""}
            disabled
            className="opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed here.
          </p>
        </div>

        <Button
          type="submit"
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" /> Saved
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>
    </div>
  );
}

function AccountTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    // TODO: wire to password change API
    setPwSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPwSaved(false), 2500);
  };

  return (
    <div className="space-y-10">
      {/* Password */}
      <div>
        <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" /> Change Password
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Choose a strong password you do not use elsewhere.
        </p>

        {pwError && (
          <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {pwError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
          >
            {pwSaved ? (
              <>
                <Check className="h-4 w-4 mr-2" /> Password Updated
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/20 rounded-xl p-5">
        <h2 className="text-base font-semibold text-destructive mb-1 flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all your documents. This cannot be
          undone.
        </p>
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive"
          onClick={() => {
            // TODO: wire to delete account API with confirmation modal
          }}
        >
          Delete Account
        </Button>
      </div>
    </div>
  );
}
