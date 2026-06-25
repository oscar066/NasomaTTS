"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Crown, X, Zap } from "lucide-react";
import { Button } from "./button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function UpgradeModal({
  open,
  onClose,
  title = "Pro feature",
  description = "Upgrade to Pro to unlock this feature.",
}: UpgradeModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Unlimited document uploads",
            "40+ premium AI voices",
            "All AI features (chat, summary, quiz…)",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Maybe later
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white"
            onClick={() => { onClose(); router.push("/upgrade"); }}
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
