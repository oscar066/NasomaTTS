"use client";

import React from "react";
import { Bot, FileText, HelpCircle, History } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { label: "Chat",     icon: Bot,         key: "chat"     },
  { label: "Summary",  icon: FileText,    key: "summary"  },
  { label: "Quiz",     icon: HelpCircle,  key: "quiz"     },
  { label: "Recap",    icon: History,     key: "recap"    },
] as const;

const AIActionsSidebar: React.FC = () => (
  <div className="fixed left-4 top-24 z-40 flex flex-col gap-2">
    {ACTIONS.map(({ label, icon: Icon, key }) => (
      <button
        key={key}
        onClick={() =>
          toast.info(`${label} — coming soon`, {
            description: "This AI feature is under construction.",
            classNames: {
              title: "!text-foreground !font-semibold",
              description: "!text-foreground/80",
            },
          })
        }
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-accent hover:text-primary transition-all duration-150 w-32"
      >
        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        {label}
      </button>
    ))}
  </div>
);

export default AIActionsSidebar;
