"use client";

import React, { useState } from "react";
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
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { documentsApi, type Document } from "@/lib/api";

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
      JSON.stringify({ id: file.id, content: file.content, title: file.title, pdf_url: file.pdf_url ?? null, pages: file.pages ?? null })
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
  const progressColor =
    progress === 100 ? "bg-green-500" :
    progress > 0    ? "bg-primary"    : "bg-muted";

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm leading-snug line-clamp-2 pt-0.5">
            {file.title}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Content preview */}
      {file.content && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {file.content}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {file.author?.username ?? "Unknown"}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(file.createdAt)}
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {progress === 0 ? "Not started" : progress === 100 ? "Completed" : `${progress}% listened`}
          </span>
          <Button
            size="sm"
            onClick={handlePlayClick}
            className="h-7 px-3 text-xs bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white"
          >
            <Play className="h-3 w-3 mr-1" />
            Play
          </Button>
        </div>
      </div>
    </div>
  );
}
