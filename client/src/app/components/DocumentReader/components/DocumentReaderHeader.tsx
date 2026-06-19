"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import NasomaLogo from "../../Logo/nasoma-logo";

interface DocumentReaderHeaderProps {
  docName: string;
  isPlaying: boolean;
  currentPage: number;
  totalPages: number;
  onBack: () => void;
  onRename?: (newTitle: string) => Promise<void>;
}

const DocumentReaderHeader: React.FC<DocumentReaderHeaderProps> = ({
  docName,
  isPlaying,
  currentPage,
  totalPages,
  onBack,
  onRename,
}) => {
  const [editing, setEditing]   = useState(false);
  const [value, setValue]       = useState(docName);
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(docName); }, [docName]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === docName) { cancel(); return; }
    setSaving(true);
    try {
      await onRename?.(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setValue(docName);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  };

  return (
    <header className="sticky top-0 z-20 h-14 grid grid-cols-[auto_1fr_auto] items-center bg-muted border-b border-border px-4 gap-3">

      {/* Left — back + logo */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-1 flex-shrink-0"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="w-px h-5 bg-border" />
        <NasomaLogo size="sm" />
      </div>

      {/* Centre — editable title */}
      <div className="flex items-center justify-center gap-2 min-w-0 px-4">
        {editing ? (
          <div className="flex items-center gap-2 w-full max-w-sm">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              disabled={saving}
              className="flex-1 min-w-0 bg-background border border-primary/50 rounded-md px-2.5 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 truncate"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); commit(); }}
              disabled={saving}
              className="p-1 rounded text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
              aria-label="Save title"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancel(); }}
              className="p-1 rounded text-muted-foreground hover:bg-secondary transition-colors flex-shrink-0"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onRename && setEditing(true)}
            className={`flex items-center gap-2 min-w-0 group ${onRename ? "cursor-pointer" : "cursor-default"}`}
            title={onRename ? "Click to rename" : undefined}
          >
            <h1 className="text-sm font-semibold text-foreground truncate">
              {docName || "Untitled Document"}
            </h1>
            {onRename && (
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Right — page counter + playing badge */}
      <div className="flex items-center gap-3">
        {totalPages > 0 && (
          <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
            <span className="text-foreground font-semibold">
              {Math.max(1, (currentPage >= 0 ? currentPage : 0) + 1)}
            </span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
        )}
        {isPlaying && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Playing
          </div>
        )}
      </div>

    </header>
  );
};

export default DocumentReaderHeader;
