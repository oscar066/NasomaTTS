"use client";

import React from "react";
import { History, Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";
import { useStreamingPanel } from "@/hooks/useAIPanel";
import Markdown from "@/components/Markdown";

interface RecapPanelProps {
  documentId: string;
  token: string;
}

export default function RecapPanel({ documentId, token }: RecapPanelProps) {
  const { status, content, error, run, reset } = useStreamingPanel();

  const generate = () =>
    run((append) => aiApi.recap(documentId, token, append));

  if (status === "idle") return (
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
      <Button
        onClick={generate}
        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
      >
        Generate Recap
      </Button>
    </div>
  );

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Generating recap…</p>
    </div>
  );

  if (status === "error") return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-5">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full px-5 pb-5 min-h-0">
      <ScrollArea className="flex-1">
        <Markdown content={content} className="pr-2" />
      </ScrollArea>
      {status === "done" && (
        <Button variant="outline" size="sm" onClick={generate} className="self-start gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      )}
    </div>
  );
}
