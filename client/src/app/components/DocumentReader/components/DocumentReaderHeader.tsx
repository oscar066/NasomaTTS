"use client";

/**
 * DocumentReaderHeader — sticky navigation bar for the document reader.
 *
 * Single responsibility: render the top bar containing the back button, logo,
 * document title, page/total counter, and the "Playing" live indicator.
 *
 * Purely presentational — all data and callbacks arrive as props.
 */

import React from "react";
import { ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import NasomaLogo from "../../Logo/nasoma-logo";

interface DocumentReaderHeaderProps {
  docName: string;
  isPlaying: boolean;
  /**
   * 0-based index of the current page (PDF mode) or paragraph (text mode).
   * Pass -1 when nothing is active yet — the counter will show "1".
   */
  currentPage: number;
  totalPages: number;
  /** Called when the user clicks the back button. */
  onBack: () => void;
}

const DocumentReaderHeader: React.FC<DocumentReaderHeaderProps> = ({
  docName,
  isPlaying,
  currentPage,
  totalPages,
  onBack,
}) => (
  <header className="sticky top-0 z-20 h-14 flex items-center bg-background border-b border-border px-4 gap-3">

    {/* Back button */}
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground -ml-1 flex-shrink-0"
      onClick={onBack}
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      Back
    </Button>

    <div className="w-px h-5 bg-border flex-shrink-0" />

    {/* Logo — pulses while audio is playing */}
    <NasomaLogo size="sm" showPulse={isPlaying} />

    <div className="w-px h-5 bg-border flex-shrink-0" />

    {/* Document title */}
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <h1 className="text-sm font-semibold text-foreground truncate">
        {docName || "Untitled Document"}
      </h1>
    </div>

    {/* Page counter — only shown when there is more than one page/paragraph */}
    {totalPages > 0 && (
      <div className="flex items-center gap-1 flex-shrink-0 text-xs font-mono tabular-nums text-muted-foreground">
        <span className="text-foreground font-semibold">
          {Math.max(1, (currentPage >= 0 ? currentPage : 0) + 1)}
        </span>
        <span>/</span>
        <span>{totalPages}</span>
      </div>
    )}

    {/* Live "Playing" badge */}
    {isPlaying && (
      <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-primary font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Playing
      </div>
    )}

  </header>
);

export default DocumentReaderHeader;
