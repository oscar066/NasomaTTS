import { Check, Sparkles, Star, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const plans = [
  {
    name: "Free",
    description: "Perfect for casual users",
    price: "$0",
    period: "forever",
    features: [
      "10,000 characters per month",
      "5 natural-sounding voices",
      "Standard quality audio",
      "Basic voice customization",
    ],
    action: "Get Started",
    icon: Sparkles,
  },
  {
    name: "Pro",
    description: "Ideal for content creators",
    price: "$29",
    period: "per month",
    features: [
      "100,000 characters per month",
      "20 premium voices & accents",
      "High quality audio",
      "Advanced voice controls",
      "Priority support",
    ],
    highlighted: true,
    badge: "Popular",
    action: "Upgrade to Pro",
    icon: Star,
  },
  {
    name: "Enterprise",
    description: "For teams and organizations",
    price: "Custom",
    period: "pricing",
    features: [
      "Unlimited characters",
      "All voices & features",
      "Custom voice creation",
      "Dedicated support",
      "Team management",
    ],
    action: "Contact Sales",
    icon: Building,
  },
];

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-lg text-muted-foreground">
            Start free and upgrade as you grow. No hidden fees.
          </p>

          <div className="flex items-center justify-center mt-8">
            <span
              className={`mr-3 ${
                !isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full 
              ${isYearly ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isYearly ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span
              className={`ml-3 ${
                isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                -20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105
                ${
                  plan.highlighted
                    ? "border-2 border-primary/20 bg-card/50"
                    : "border border-border bg-card hover:border-primary/20"
                }`}
            >
              {plan.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 
                               rounded-full text-xs text-white font-medium"
                >
                  {plan.badge}
                </span>
              )}

              <div className="mb-8">
                <plan.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {isYearly && plan.price !== "$0" && plan.price !== "Custom"
                    ? `$${parseInt(plan.price.slice(1)) * 0.8}`
                    : plan.price}
                </span>
                <span className="text-muted-foreground ml-2">
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full transition-colors duration-200 ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                }`}
              >
                {plan.action}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
