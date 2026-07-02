"use client";

import { useState, useCallback } from "react";

export type AIStatus = "idle" | "loading" | "streaming" | "done" | "error";

export function useStreamingPanel() {
  const [status, setStatus] = useState<AIStatus>("idle");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: (append: (t: string) => void) => Promise<void>) => {
    setStatus("loading");
    setContent("");
    setError(null);
    try {
      await fn((token) => {
        setStatus("streaming");
        setContent((prev) => prev + token);
      });
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setContent("");
    setError(null);
  }, []);

  return { status, content, error, run, reset };
}
