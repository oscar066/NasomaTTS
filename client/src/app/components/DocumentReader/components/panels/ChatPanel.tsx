"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi } from "@/lib/api";
import Markdown from "@/components/Markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! Ask me anything about this document characters, themes, plot points, or anything else you're curious about.",
};

interface ChatPanelProps {
  documentId: string;
  token: string;
}

export default function ChatPanel({ documentId, token }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const threadIdRef = useRef<string | undefined>(undefined);
  const bottomRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    // Add empty assistant message that we'll stream into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const threadId = await aiApi.chat(
        documentId,
        text,
        token,
        (token) => {
          setMessages((m) => {
            const updated = [...m];
            updated[updated.length - 1] = {
              role: "assistant",
              content: updated[updated.length - 1].content + token,
            };
            return updated;
          });
        },
        threadIdRef.current,
      );
      threadIdRef.current = threadId;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      // Remove the empty assistant message on error
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-5 py-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content ? (
                  msg.role === "assistant" ? (
                    <Markdown content={msg.content} className="text-sm" />
                  ) : (
                    msg.content
                  )
                ) : loading && i === messages.length - 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            </div>
          ))}

          {error && (
            <p className="text-xs text-destructive text-center px-2">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="px-5 pb-5 flex gap-2 flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document…"
          className="text-sm bg-muted/50 border-border focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
