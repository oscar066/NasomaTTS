import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FadeIn from "@/app/components/ui/FadeIn";

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden bg-background">
      {/* gradient orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--primary) / 0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container mx-auto px-4 relative text-center">
        <FadeIn>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-6 bg-primary/10 px-3 py-1.5 rounded-full">
            Get Started Today
          </span>
        </FadeIn>

        <FadeIn delay={100}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight">
            Your next great read is{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              waiting to be heard.
            </span>
          </h2>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Turn any PDF or document into natural audio in seconds.
            Start free — no credit card, no commitment.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/auth/signup" passHref>
              <Button
                size="lg"
                className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 hover:-translate-y-0.5 text-base px-8"
              >
                <BookOpen className="mr-2 h-5 w-5" /> Start Reading Free
              </Button>
            </Link>
            <Link href="#how-it-works" passHref>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-border hover:border-primary/40 hover:bg-primary/5 text-base px-8"
              >
                See How It Works <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={400}>
          <p className="text-sm text-muted-foreground">
            Free forever · 10,000 characters/month · No credit card required
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
