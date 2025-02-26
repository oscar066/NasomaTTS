import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: [
      "10,000 characters per month",
      "5 voices",
      "Standard quality audio",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    features: [
      "100,000 characters per month",
      "20 voices",
      "High quality audio",
      "Priority email support",
      "API access",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited characters",
      "All voices",
      "Ultra-high quality audio",
      "Dedicated account manager",
      "Custom voice creation",
      "SLA",
    ],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`border rounded-lg p-6 flex flex-col ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground"
              } transition-transform hover:scale-105`}
            >
              <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
              <p className="text-4xl font-bold mb-6">{plan.price}</p>
              <ul className="mb-6 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center mb-2">
                    <Check className="h-5 w-5 text-primary mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "secondary" : "outline"}
              >
                Choose Plan
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
