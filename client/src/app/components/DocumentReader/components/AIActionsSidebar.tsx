"use client";

import React, { useState } from "react";
import { Bot, FileText, HelpCircle, History, X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

import { type ActionKey, PANEL_META } from "./panels/types";
import ChatPanel    from "./panels/ChatPanel";
import SummaryPanel from "./panels/SummaryPanel";
import QuizPanel    from "./panels/QuizPanel";
import RecapPanel   from "./panels/RecapPanel";

// ── Action config ─────────────────────────────────────────────────────────────

const ACTIONS: { label: string; icon: React.ElementType; key: ActionKey }[] = [
  { label: "Chat",    icon: Bot,        key: "chat"    },
  { label: "Summary", icon: FileText,   key: "summary" },
  { label: "Quiz",    icon: HelpCircle, key: "quiz"    },
  { label: "Recap",   icon: History,    key: "recap"   },
];

// ── Component ─────────────────────────────────────────────────────────────────

const AIActionsSidebar: React.FC = () => {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const close = () => setOpen(null);

  const activeAction = ACTIONS.find((a) => a.key === open);

  return (
    <>
      {/* Floating action buttons — hidden while drawer is open */}
      {open === null && (
        <div className="fixed left-4 top-24 z-40 flex flex-col gap-2">
          {ACTIONS.map(({ label, icon: Icon, key }) => (
            <button
              key={key}
              onClick={() => setOpen(key)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-medium shadow-sm transition-all duration-150 w-32 bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Left-side drawer — modal={false} keeps the page behind fully visible */}
      <DrawerPrimitive.Root
        open={open !== null}
        onOpenChange={(o) => { if (!o) close(); }}
        direction="left"
        modal={false}
        shouldScaleBackground={false}
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Content
            className="
              fixed left-0 top-14 bottom-0 z-50
              flex flex-col outline-none
              bg-background border-r border-t border-border shadow-xl rounded-br-2xl
              w-[min(400px,100vw)]
              h-[calc(100vh-3.5rem)]
            "
          >
            {/* Header */}
            <DrawerHeader className="flex-shrink-0 border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center gap-3">
                {activeAction && (
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <activeAction.icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <DrawerTitle className="text-base">
                    {open ? PANEL_META[open].title : ""}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs mt-0.5">
                    {open ? PANEL_META[open].description : ""}
                  </DrawerDescription>
                </div>
                <button
                  onClick={close}
                  aria-label="Close panel"
                  className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DrawerHeader>

            {/* Panel body */}
            <div className="flex-1 overflow-hidden pt-4">
              {open === "chat"    && <ChatPanel />}
              {open === "summary" && <SummaryPanel />}
              {open === "quiz"    && <QuizPanel />}
              {open === "recap"   && <RecapPanel />}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </>
  );
};

export default AIActionsSidebar;
