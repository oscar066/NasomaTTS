"use client";

import React, { useState } from "react";
import { Bot, FileText, HelpCircle, History, X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

import { type ActionKey, PANEL_META } from "./panels/types";
import ChatPanel    from "./panels/ChatPanel";
import SummaryPanel from "./panels/SummaryPanel";
import QuizPanel    from "./panels/QuizPanel";
import RecapPanel   from "./panels/RecapPanel";

const ACTIONS: { label: string; icon: React.ElementType; key: ActionKey }[] = [
  { label: "Chat",    icon: Bot,        key: "chat"    },
  { label: "Summary", icon: FileText,   key: "summary" },
  { label: "Quiz",    icon: HelpCircle, key: "quiz"    },
  { label: "Recap",   icon: History,    key: "recap"   },
];

interface AIActionsSidebarProps {
  onOpenChange?: (isOpen: boolean) => void;
}

const AIActionsSidebar: React.FC<AIActionsSidebarProps> = ({ onOpenChange }) => {
  const [open, setOpen] = useState<ActionKey | null>(null);

  const setPanel = (key: ActionKey | null) => {
    setOpen(key);
    onOpenChange?.(key !== null);
  };
  const close = () => setPanel(null);

  const activeAction = ACTIONS.find((a) => a.key === open);

  return (
    <>
      {/* Floating action buttons — hidden while drawer is open */}
      {open === null && (
        <div className="fixed left-4 top-24 z-40 flex flex-col gap-2">
          {ACTIONS.map(({ label, icon: Icon, key }) => (
            <button
              key={key}
              onClick={() => setPanel(key)}
              title={label}
              className="flex items-center justify-center sm:justify-start gap-2.5 px-2 py-2 sm:px-3 rounded-xl border border-border text-sm font-medium shadow-sm transition-all duration-150 w-10 sm:w-32 bg-muted/50 text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="hidden sm:inline">{label}</span>
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
            className="fixed left-0 top-14 bottom-0 z-50 flex flex-row outline-none shadow-xl w-[min(448px,100vw)]"
          >
            {/* Left icon strip — switch panels without closing */}
            <div className="flex flex-col gap-2 pt-4 px-1.5 bg-muted/30 border-r border-border flex-shrink-0">
              {ACTIONS.map(({ label, icon: Icon, key }) => (
                <button
                  key={key}
                  onClick={() => setPanel(key)}
                  title={label}
                  className={cn(
                    "p-2 rounded-xl border transition-all duration-150",
                    "hover:text-primary hover:border-primary/40 hover:bg-muted",
                    open === key
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex flex-col flex-1 overflow-hidden bg-background border-r border-t border-border rounded-br-2xl">
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
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </>
  );
};

export default AIActionsSidebar;
