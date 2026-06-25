"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Check,
  X,
  Zap,
  Crown,
  Building,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/app/components/Dashboard/SideBar";
import { TopBar } from "@/app/components/Dashboard/TopBar";

const currencies = [
  { code: "USD", symbol: "$",    rate: 1 },
  { code: "GBP", symbol: "£",   rate: 0.79 },
  { code: "KES", symbol: "Ksh", rate: 130 },
];

const freeFeatures = [
  { text: "Up to 5 documents",             included: true },
  { text: "5 natural-sounding voices",    included: true },
  { text: "Standard quality audio",       included: true },
  { text: "Basic playback controls",      included: true },
  { text: "AI features",                  included: false },
  { text: "Premium voices",               included: false },
  { text: "Audio download",               included: false },
  { text: "Priority support",             included: false },
];

const proFeatures = [
  { text: "Unlimited documents",          included: true },
  { text: "40+ premium voices & accents", included: true },
  { text: "All AI features included",     included: true },
  { text: "High quality audio download",  included: true },
  { text: "Advanced playback controls",   included: true },
  { text: "Priority support",             included: true },
];

function formatPrice(monthlyPrice: number, yearly: boolean, currency: typeof currencies[number]): string {
  const base = yearly ? monthlyPrice * 0.8 : monthlyPrice;
  const converted = Math.round(base * currency.rate);
  return `${currency.symbol}${converted.toLocaleString()}`;
}

export default function UpgradePage() {
  const { data: session, status } = useSession({ required: true });
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [isYearly, setIsYearly]   = useState(false);
  const [currency, setCurrency]   = useState(currencies[0]);

  React.useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = session?.user?.plan === "pro";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade your plan
              </div>
              <h1 className="text-2xl font-bold mb-2">Read more. Understand more.</h1>
              <p className="text-sm text-muted-foreground">
                Unlock AI tools, premium voices, and unlimited documents with Pro.
              </p>
            </div>

            {/* Currency switcher */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    currency.code === c.code
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ${
                  isYearly ? "bg-primary" : "bg-muted"
                }`}
                aria-label="Toggle billing period"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    isYearly ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly
                <span className="ml-1.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-semibold">
                  Save 20%
                </span>
              </span>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

              {/* Free — current plan */}
              <div className="flex flex-col p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {!isPro && (
                    <span className="text-xs font-semibold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      Current plan
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold mb-1">Free</h2>
                <p className="text-xs text-muted-foreground mb-4">Perfect for casual readers</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{currency.symbol}0</span>
                  <span className="text-muted-foreground text-sm"> / forever</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {freeFeatures.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {f.included
                        ? <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        : <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/50 line-through"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" disabled className="w-full opacity-50 cursor-not-allowed">
                  {isPro ? "Downgrade" : "Current plan"}
                </Button>
              </div>

              {/* Pro */}
              <div className="relative flex flex-col p-6 rounded-xl border-2 border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 px-4 py-1 rounded-full text-xs text-white font-semibold shadow-md whitespace-nowrap">
                  Most Popular
                </span>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                  {isPro && (
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Current plan
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold mb-1">Pro</h2>
                <p className="text-xs text-muted-foreground mb-4">For avid readers who want more</p>
                <div className="mb-1">
                  <span className="text-3xl font-bold">{formatPrice(9, isYearly, currency)}</span>
                  <span className="text-muted-foreground text-sm"> / month</span>
                </div>
                {isYearly && (
                  <p className="text-xs text-green-600 dark:text-green-400 mb-5">
                    Billed {currency.symbol}{Math.round(9 * 0.8 * 12 * currency.rate).toLocaleString()} / year
                  </p>
                )}
                {!isYearly && <div className="mb-5" />}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {proFeatures.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white shadow-md"
                  disabled={isPro}
                  onClick={() => {
                    // TODO: wire to payment provider (Stripe, etc.)
                  }}
                >
                  {isPro ? "You are on Pro" : "Upgrade to Pro"}
                </Button>
              </div>

              {/* Enterprise */}
              <div className="flex flex-col p-6 rounded-xl border border-border bg-card">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <Building className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-bold mb-1">Enterprise</h2>
                <p className="text-xs text-muted-foreground mb-4">For teams and organizations</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">Custom</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {[
                    "Everything in Pro",
                    "Unlimited team members",
                    "Custom voice creation",
                    "Dedicated account manager",
                    "Team analytics dashboard",
                    "SLA and custom contracts",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => (window.location.href = "mailto:sales@menasoma.com")}
                >
                  Contact Sales
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              All plans include a 14-day free trial. No credit card required to start.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
