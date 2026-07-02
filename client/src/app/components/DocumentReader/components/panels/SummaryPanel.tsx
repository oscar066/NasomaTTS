"use client";

import React from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";
import { useStreamingPanel } from "@/hooks/useAIPanel";
import Markdown from "@/components/Markdown";

interface SummaryPanelProps {
  documentId: string;
  token: string;
}

export default function SummaryPanel({ documentId, token }: SummaryPanelProps) {
  const { status, content, error, run, reset } = useStreamingPanel();

  const generate = (force = false) =>
    run((append) => aiApi.summary(documentId, token, append, force));

  if (status === "idle") return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-5">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <FileText className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Generate a Summary</p>
        <p className="text-sm text-muted-foreground mt-1">
          Get a concise overview of this document's key points and themes.
        </p>
      </div>
      <Button onClick={() => generate()}>Generate Summary</Button>
    </div>
  );

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Generating summary…</p>
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
        <Button variant="outline" size="sm" onClick={() => generate(true)} className="self-start gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      )}
    </div>
  );
}
