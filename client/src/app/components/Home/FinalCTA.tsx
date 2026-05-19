import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Headphones, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";

const benefits = [
  { icon: BookOpen, text: "Turn any PDF or document into audio" },
  { icon: Headphones, text: "Listen hands-free, eyes-free, anywhere" },
  { icon: Globe, text: "40+ voices across 100+ languages" },
  { icon: ShieldCheck, text: "No credit card required to start" },
];

export default function FinalCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-700 z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 border border-white/20">
            Start for free — upgrade when you&apos;re ready
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Your documents deserve to{" "}
            <span className="underline decoration-wavy decoration-white/40 underline-offset-8">
              be heard
            </span>
          </h2>

          <p className="text-lg md:text-xl mb-10 text-white/85 leading-relaxed max-w-2xl mx-auto">
            Join thousands who&apos;ve transformed how they consume content. Listen
            to articles, books, and documents anytime, anywhere — without
            looking at a screen.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 text-center bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10"
              >
                <benefit.icon className="h-5 w-5 text-white/90" />
                <p className="text-xs font-medium text-white/90 leading-snug">{benefit.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary font-semibold hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all"
              >
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto text-white border border-white/30 hover:bg-white/10 transition-all"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <p className="text-sm text-white/60 mt-5">
            Free forever on the starter plan · No credit card needed
          </p>
        </div>
      </div>
    </section>
  );
}
