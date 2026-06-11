"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Play,
  MoreHorizontal,
  Trash2,
  Pencil,
  Share2,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { documentsApi, thumbnailProxyUrl, type Document } from "@/lib/api";

function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color =
    percent === 100 ? "#22c55e" :
    percent > 0     ? "hsl(var(--primary))" :
                      "hsl(var(--muted-foreground))";

  return (
    <div className="relative flex items-center justify-center w-11 h-11 flex-shrink-0">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold leading-none" style={{ color }}>
        {percent === 100 ? "✓" : `${percent}%`}
      </span>
    </div>
  );
}

interface FileCardProps {
  file: Document;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function FileCard({ file, onDelete, onRename }: FileCardProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [thumbError, setThumbError]       = useState(false);
  const [isRenaming, setIsRenaming]       = useState(false);
  const [renameValue, setRenameValue]     = useState(file.title);
  const [renameLoading, setRenameLoading] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const hasThumbnail = !!file.thumbnail_url && !thumbError;
  const totalPages   = file.pages?.length ?? 0;
  const progress     = totalPages > 0
    ? Math.min(100, Math.round(((file.current_page ?? 0) / totalPages) * 100))
    : 0;

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(file.title);
    setIsRenaming(true);
    // Defer focus so the input is in the DOM before we select it
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.title) { setIsRenaming(false); return; }
    try {
      setRenameLoading(true);
      await documentsApi.rename(file.id, trimmed, session?.accessToken ?? "");
      onRename?.(file.id, trimmed);
      toast.success("Renamed", { description: `"${trimmed}"` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to rename", { description: msg });
      setRenameValue(file.title);
    } finally {
      setRenameLoading(false);
      setIsRenaming(false);
    }
  };

  const cancelRename = () => { setRenameValue(file.title); setIsRenaming(false); };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  { e.preventDefault(); commitRename(); }
    if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDeleteLoading(true);
      await documentsApi.delete(file.id, session?.accessToken ?? "");
      toast.success("Document deleted", {
        description: "The document has been removed from your library.",
      });
      onDelete?.(file.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to delete", { description: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pagesForCache = file.pages?.map(({ page_number, text }) => ({ page_number, text })) ?? null;
    try {
      localStorage.setItem(
        "currentDocument",
        JSON.stringify({
          id: file.id,
          content: file.content,
          title: file.title,
          pdf_url: file.pdf_url ?? null,
          thumbnail_url: file.thumbnail_url ?? null,
          pages: pagesForCache,
        })
      );
    } catch {
      // Storage full — reader will fetch from the API instead
    }
    router.push(`/documents/${file.id}?autoplay=true`);
  };

  const handleCardClick = () => { if (!isRenaming) router.push(`/documents/${file.id}`); };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
    >
      <div className="relative w-full bg-muted/30 overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: "240px" }}>
        {hasThumbnail ? (
          <img
            src={thumbnailProxyUrl(file.id)}
            alt={`Preview of ${file.title}`}
            className="w-full h-full object-cover object-top"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted/40 to-muted/60">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="w-3/4 space-y-1.5 opacity-30">
              {[100, 90, 95, 80, 100, 70].map((w, i) => (
                <div key={i} className="h-1.5 bg-foreground rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startRename}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info("Coming soon", { description: "Sharing is not yet available." });
                }}
              >
                <Share2 className="h-3.5 w-3.5 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {deleteLoading ? "Deleting…" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {isRenaming ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKey}
              disabled={renameLoading}
              className="h-7 text-sm px-2 py-0 flex-1 min-w-0"
              maxLength={200}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 flex-shrink-0" onClick={commitRename} disabled={renameLoading}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground flex-shrink-0" onClick={cancelRename} disabled={renameLoading}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {file.title}
          </span>
        )}

        <div className="flex items-center gap-2">
          <ProgressRing percent={progress} />
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground flex-1 min-w-0">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDate(file.createdAt)}</span>
          </span>
          <Button
            size="sm"
            onClick={handlePlayClick}
            className="h-7 px-3 text-xs bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white flex-shrink-0"
          >
            <Play className="h-3 w-3 mr-1" />
            Read
          </Button>
        </div>
      </div>
    </div>
  );
}
