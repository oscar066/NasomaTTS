"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft, Search, Bell, FileText, User, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDocumentsStore } from "@/store/documents";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
}

function UserAvatar({ name, email }: UserAvatarProps) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold select-none">
      {initials}
    </div>
  );
}

interface TopBarProps {
  onToggleSidebar: () => void;
  onSearch?: (query: string) => void;
}

export function TopBar({ onToggleSidebar, onSearch }: TopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { documents, readNotificationIds, markNotificationRead } = useDocumentsStore();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login", redirect: true });
  };

  const userName  = session?.user?.name ?? session?.user?.email ?? "User";
  const userEmail = session?.user?.email ?? "";

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const unreadDocs = recentDocs.filter((d) => !readNotificationIds.includes(d.id));

  return (
    <header className="h-14 flex items-center bg-muted border-b border-border flex-shrink-0 px-4 gap-3">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search documents..."
          className="pl-9 bg-secondary/50 border-0 focus-visible:bg-background focus-visible:ring-1"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadDocs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {unreadDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No new notifications</p>
                <p className="text-xs text-muted-foreground/60 mt-1">You are all caught up</p>
              </div>
            ) : (
              unreadDocs.map((doc) => (
                <DropdownMenuItem
                  key={doc.id}
                  className="flex items-start gap-3 py-3 cursor-pointer"
                  onClick={() => markNotificationRead(doc.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uploaded {timeAgo(doc.createdAt)}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="User menu"
            >
              <UserAvatar name={session?.user?.name} email={session?.user?.email} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings?tab=profile")}>
              <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
