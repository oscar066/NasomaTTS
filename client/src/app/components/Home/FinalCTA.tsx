// Final CTA Section Component

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ArrowRight,
  BookOpen,
  Headphones,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default function FinalCTA() {
  const benefits = [
    { icon: BookOpen, text: "Turn any text into natural audio" },
    { icon: Headphones, text: "Listen on-the-go, hands & eyes free" },
    { icon: Globe, text: "40+ voices & 100+ language options" },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700 z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl"></div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
            Save Time and Reduce Eye Strain With{" "}
            <span className="underline decoration-wavy decoration-white/30 underline-offset-8">
              Nasoma
            </span>
          </h2>

          <p className="text-xl mb-10 text-white/90">
            Join thousands who've transformed how they consume content. Listen
            to articles, books, and documents anytime, anywhere—without looking
            at a screen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-left bg-white/10 p-4 rounded-lg backdrop-blur-sm"
              >
                <benefit.icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-white" />
                <p className="text-sm font-medium">{benefit.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/auth/signup/" passHref>
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto font-medium text-primary shadow-lg hover:shadow-xl transition-all"
              >
                Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-sm text-white/80">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path
            fill="currentColor"
            fillOpacity="0.1"
            d="M0,160L48,170.7C96,181,192,203,288,208C384,213,480,203,576,165.3C672,128,768,64,864,53.3C960,43,1056,85,1152,117.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </section>
  );
}
