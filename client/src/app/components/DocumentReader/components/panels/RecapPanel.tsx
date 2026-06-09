"use client";

import React, { useState } from "react";
import { History, Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function RecapPanel() {
  const [loading, setLoading] = useState(false);
  const [recap, setRecap]     = useState<string | null>(null);

  const generate = () => {
    setLoading(true);
    setRecap(null);
    // TODO: replace with real AI endpoint call
    setTimeout(() => {
      setRecap(
        "Recap generation will be connected to your document shortly. This will remind you of what you've read so far — covering the main events, character developments, and where the story currently stands."
      );
      setLoading(false);
    }, 1200);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Generating recap…</p>
    </div>
  );

  if (!recap) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-5">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <History className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Reading Recap</p>
        <p className="text-sm text-muted-foreground mt-1">
          Get caught up on what you've read so far — perfect after a break.
        </p>
      </div>
      <Button onClick={generate}>Generate Recap</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full px-5 pb-5 min-h-0">
      <ScrollArea className="flex-1">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-2">{recap}</p>
      </ScrollArea>
      <Button variant="outline" size="sm" onClick={generate} className="self-start gap-2">
        <RefreshCw className="h-3.5 w-3.5" /> Regenerate
      </Button>
    </div>
  );
}
