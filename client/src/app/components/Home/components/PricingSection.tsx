"use client";

import { Check, Sparkles, Star, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import FadeIn from "@/app/components/ui/FadeIn";

const currencies = [
  { code: "USD", symbol: "$",    rate: 1 },
  { code: "GBP", symbol: "£",   rate: 0.79 },
  { code: "KES", symbol: "Ksh", rate: 130 },
];

const plans = [
  {
    name: "Free",
    description: "Perfect for casual listeners",
    monthlyPrice: 0,
    period: "forever",
    features: [
      "Up to 10 documents",
      "5 natural-sounding voices",
      "Standard quality audio",
      "Basic playback controls",
      "No AI features",
    ],
    action: "Get Started Free",
    href: "/auth/signup",
    icon: Sparkles,
  },
  {
    name: "Pro",
    description: "Ideal for avid readers",
    monthlyPrice: 9,
    period: "per month",
    features: [
      "Unlimited documents",
      "40+ premium voices & accents",
      "All AI features included",
      "High quality audio download",
      "Advanced playback controls",
      "Priority support",
    ],
    highlighted: true,
    badge: "Most Popular",
    action: "Start Pro Trial",
    href: "/auth/signup",
    icon: Star,
  },
  {
    name: "Enterprise",
    description: "For teams and organizations",
    monthlyPrice: null,
    period: "custom pricing",
    features: [
      "Unlimited characters",
      "All voices & languages",
      "Custom voice creation",
      "Dedicated account manager",
      "Team management & analytics",
    ],
    action: "Contact Sales",
    href: "/contact",
    icon: Building,
  },
];

function formatPrice(
  monthlyPrice: number | null,
  yearly: boolean,
  currency: typeof currencies[number]
): string {
  if (monthlyPrice === null) return "Custom";
  if (monthlyPrice === 0) return `${currency.symbol}0`;
  const base = yearly ? monthlyPrice * 0.8 : monthlyPrice;
  const converted = Math.round(base * currency.rate);
  return `${currency.symbol}${converted.toLocaleString()}`;
}

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const [currency, setCurrency] = useState(currencies[0]);

  return (
    <section id="pricing" className="py-16 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative">
        <FadeIn className="text-center mb-10">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full">
            Pricing
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Simple,{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-base text-muted-foreground">
            Start free and upgrade as you grow. No hidden fees.
          </p>

          {/* Currency switcher */}
          <div className="flex items-center justify-center gap-1 mt-8 mb-4">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${
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
          <div className="flex items-center justify-center gap-3">
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
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <FadeIn key={index} delay={index * 100} className="h-full">
            <div
              className={`relative h-full flex flex-col p-8 rounded-xl transition-all duration-300 hover:shadow-xl
                ${
                  plan.highlighted
                    ? "border-2 border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border border-border bg-card hover:border-primary/30"
                }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 px-4 py-1 rounded-full text-xs text-white font-semibold shadow-md">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${plan.highlighted ? "bg-primary/10" : "bg-secondary"}`}>
                  <plan.icon className={`h-5 w-5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">
                    {formatPrice(plan.monthlyPrice, isYearly, currency)}
                  </span>
                  {plan.monthlyPrice !== null && (
                    <span className="text-muted-foreground text-sm mb-1.5">/{plan.period}</span>
                  )}
                  {plan.monthlyPrice === null && (
                    <span className="text-muted-foreground text-sm mb-1.5">{plan.period}</span>
                  )}
                </div>
                {isYearly && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Billed {currency.symbol}{Math.round(plan.monthlyPrice * 0.8 * 12 * currency.rate).toLocaleString()}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-primary" : "text-green-500"}`} />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  className={`w-full transition-all duration-200 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {plan.action}
                </Button>
              </Link>
            </div>
            </FadeIn>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  );
}
