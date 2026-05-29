"use client";

import React, { useState } from "react";

// Circular SVG progress ring — shows reading completion as a score badge.
function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color =
    percent === 100 ? "#22c55e" :   // green-500
    percent > 0     ? "hsl(var(--primary))" :
                      "hsl(var(--muted-foreground))";

  return (
    <div className="relative flex items-center justify-center w-11 h-11 flex-shrink-0">
      <svg width="44" height="44" className="-rotate-90">
        {/* Track */}
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
        {/* Fill */}
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
      <span
        className="absolute text-[10px] font-bold leading-none"
        style={{ color }}
      >
        {percent === 100 ? "✓" : `${percent}%`}
      </span>
    </div>
  );
}
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Play,
  MoreHorizontal,
  Trash2,
  Pencil,
  Share2,
  Calendar,
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

// `progress` is not in the API type but may be present at runtime
type FileCardDocument = Document & { progress?: number };

interface FileCardProps {
  file: FileCardDocument;
  onDelete?: (id: string) => void;
}

export function FileCard({ file, onDelete }: FileCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const hasThumbnail = !!file.thumbnail_url && !thumbError;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this document?")) return;

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
    localStorage.setItem(
      "currentDocument",
      JSON.stringify({
        id: file.id,
        content: file.content,
        title: file.title,
        pdf_url: file.pdf_url ?? null,
        thumbnail_url: file.thumbnail_url ?? null,
        pages: file.pages ?? null,
      })
    );
    router.push(`/documents/${file.id}?autoplay=true`);
  };

  const handleCardClick = () => router.push(`/documents/${file.id}`);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const progress = file.progress ?? 0;

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* ── Thumbnail / cover area ── */}
      <div className="relative w-full bg-muted/30 overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: "240px" }}>
        {hasThumbnail ? (
          <img
            src={thumbnailProxyUrl(file.id)}
            alt={`Preview of ${file.title}`}
            className="w-full h-full object-cover object-top"
            onError={() => setThumbError(true)}
          />
        ) : (
          /* Fallback: styled placeholder that mimics a document page */
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted/40 to-muted/60">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            {/* Faux text lines to suggest a document page */}
            <div className="w-3/4 space-y-1.5 opacity-30">
              {[100, 90, 95, 80, 100, 70].map((w, i) => (
                <div key={i} className="h-1.5 bg-foreground rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Dropdown — sits in top-right corner of the cover */}
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info("Coming soon", { description: "Rename is not yet available." });
                }}
              >
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

      {/* ── Card body ── */}
      <div className="flex flex-col gap-2 p-3">
        <span className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
          {file.title}
        </span>

        {/* Progress ring · date · play — all on one line */}
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
