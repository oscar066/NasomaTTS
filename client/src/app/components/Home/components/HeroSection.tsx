import { Button } from "@/components/ui/button";
import { Play, BookOpen, Pause, SkipBack, SkipForward, Headphones } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] flex flex-col overflow-hidden">

      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-background z-0" />
      <div className="absolute -top-32 -right-32 w-[680px] h-[680px] rounded-full bg-primary/20 blur-[120px] z-0 animate-orb-drift" />
      <div
        className="absolute top-1/4 -left-48 w-[560px] h-[560px] rounded-full bg-violet-500/20 blur-[120px] z-0 animate-orb-drift"
        style={{ animationDelay: "2.5s" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[100px] z-0 animate-orb-drift"
        style={{ animationDelay: "5s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-sky-400/10 blur-[100px] z-0 animate-orb-drift"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-0" />

      {/* Main content */}
      <div className="flex-1 flex items-center relative z-10">
        <div className="container mx-auto px-4 w-full py-12">
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">

            {/* Left column — staggered entrance */}
            <div className="md:w-1/2 text-left">

              {/* Badge */}
              <div
                className="opacity-0 animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
                style={{ animationDelay: "0.1s" }}
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>Your content, your voice</span>
              </div>

              {/* Headline */}
              <h1
                className="opacity-0 animate-fade-up text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-[1.1] tracking-tight"
                style={{ animationDelay: "0.25s" }}
              >
                <span className="text-foreground">Turn Reading Into</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
                  Listening Freedom
                </span>
              </h1>

              {/* Body */}
              <p
                className="opacity-0 animate-fade-up text-base md:text-lg mb-10 text-muted-foreground leading-relaxed max-w-lg"
                style={{ animationDelay: "0.4s" }}
              >
                Nasoma transforms any PDF or document into natural, engaging audio
                that fits your life. Listen while you commute, exercise, or relax
                — saving time and reducing eye strain.
              </p>

              {/* Buttons */}
              <div
                className="opacity-0 animate-fade-up flex flex-col sm:flex-row items-start sm:items-center gap-3.5 mb-10"
                style={{ animationDelay: "0.55s" }}
              >
                <Link href="/auth/signup" passHref>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 hover:-translate-y-0.5 text-base px-7"
                  >
                    <BookOpen className="mr-2 h-5 w-5" /> Start Reading Free
                  </Button>
                </Link>
                <Link href="/auth/login" passHref>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-border hover:border-primary/40 hover:bg-primary/5 shadow-sm text-base px-7"
                  >
                    <Play className="mr-2 h-4 w-4 text-primary fill-primary" /> Sign In
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div
                className="opacity-0 animate-fade-up flex items-center gap-3 text-sm text-muted-foreground"
                style={{ animationDelay: "0.7s" }}
              >
                <div className="flex -space-x-2.5">
                  {[
                    { color: "#6366f1", initial: "S" },
                    { color: "#8b5cf6", initial: "M" },
                    { color: "#0ea5e9", initial: "E" },
                    { color: "#10b981", initial: "D" },
                  ].map(({ color, initial }, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-semibold text-foreground">12,000+</span>{" "}
                  readers worldwide
                  <span className="ml-2 text-amber-500 font-medium">★★★★★</span>
                </div>
              </div>
            </div>

            {/* Right column — mockup */}
            <div
              className="md:w-1/2 flex justify-center opacity-0 animate-fade-in-right"
              style={{ animationDelay: "0.35s" }}
            >
              {/* Float wrapper */}
              <div className="relative animate-float">
                {/* Ambient glow */}
                <div className="absolute -z-10 -top-8 -left-8 w-80 h-80 bg-primary/8 rounded-full blur-2xl" />
                <div className="absolute -z-10 -bottom-8 -right-8 w-80 h-80 bg-purple-500/8 rounded-full blur-2xl" />

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden w-full max-w-md">

                  {/* Window chrome */}
                  <div className="bg-secondary/40 px-4 py-3 flex items-center gap-3 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <span className="text-xs text-muted-foreground flex-1 text-center truncate pr-8 font-medium">
                      The Great Office Chair Heist.pdf
                    </span>
                  </div>

                  {/* Document content */}
                  <div className="p-6 space-y-3 max-h-52 overflow-hidden">
                    <h4 className="font-bold text-sm text-foreground">The Great Office Chair Heist</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      It all started with an innocent desire for comfort. Ethan, a junior
                      developer at TechNova Inc.,{" "}
                      <span className="bg-primary/20 text-foreground rounded px-0.5 py-0.5">
                        had been suffering in silence—or rather, suffering in squeaky discomfort.
                      </span>{" "}
                      His office chair was a relic from a bygone era, a testament to the
                      company&apos;s frugality.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed opacity-50">
                      Meanwhile, across the room, the company&apos;s senior developer, Greg, sat
                      like a king on a plush, ergonomic throne. It had lumbar support, adjustable
                      arms, and most importantly: wheels that actually worked...
                    </p>
                  </div>

                  {/* Playback bar */}
                  <div className="border-t border-border bg-secondary/20 px-5 py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-semibold">
                        Karen · EN-AU
                      </span>
                      <span className="text-xs font-mono text-primary font-medium">1:24 / 8:30</span>
                    </div>

                    {/* Progress bar — animates from 0 → 17% on load */}
                    <div className="h-1.5 bg-secondary rounded-full mb-4 cursor-pointer">
                      <div className="h-1.5 bg-gradient-to-r from-primary to-purple-500 rounded-full w-0 animate-progress-fill" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
                          <SkipBack className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {/* Pulse-ring play button */}
                        <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center animate-pulse-ring hover:scale-105 transition-transform">
                          <Pause className="h-4 w-4 text-white" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
                          <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <span className="text-xs bg-secondary text-foreground px-2.5 py-1 rounded-full font-semibold">
                        1.2×
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature badges */}
                <div className="absolute -top-3 -right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/25">
                  40+ Voices
                </div>
                <div className="absolute -bottom-3 -left-4 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-primary/25">
                  100+ Languages
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="relative z-10 border-t border-border/60">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/60">
            {[
              { value: "12,000+", label: "Active Readers" },
              { value: "40+",     label: "Natural Voices" },
              { value: "100+",    label: "Languages" },
              { value: "4.9 ★",  label: "Average Rating" },
            ].map((stat, i) => (
              <div
                key={i}
                className="opacity-0 animate-fade-up flex flex-col items-center text-center py-5 px-4"
                style={{ animationDelay: `${0.8 + i * 0.1}s` }}
              >
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground mt-1 tracking-wide uppercase font-medium">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
