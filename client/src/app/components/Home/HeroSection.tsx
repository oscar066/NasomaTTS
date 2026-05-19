// Hero Section Component
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Pause, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30 z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 text-left md:pr-8">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Your content, your voice
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-foreground">Turn Reading Into</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Listening Freedom
              </span>
            </h1>

            <p className="text-lg mb-8 text-muted-foreground leading-relaxed">
              Nasoma transforms any PDF or document into natural, engaging audio
              that fits your life. Listen while you commute, exercise, or relax
              — saving time and reducing eye strain.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/auth/signup" passHref>
                <Button
                  size="lg"
                  className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                >
                  <BookOpen className="mr-2 h-5 w-5" /> Start Reading Free
                </Button>
              </Link>
              <Link href="/auth/login" passHref>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-primary/20 hover:border-primary/50 shadow-sm"
                >
                  <Play className="mr-2 h-4 w-4 text-primary" /> Sign In
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981"].map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {["S", "M", "E", "D"][i]}
                  </div>
                ))}
              </div>
              <span>
                Trusted by{" "}
                <span className="font-semibold text-foreground">12,000+</span>{" "}
                readers worldwide
              </span>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              {/* Decorative glow */}
              <div className="absolute -z-10 -top-6 -left-6 w-64 h-64 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute -z-10 -bottom-6 -right-6 w-64 h-64 bg-purple-500/5 rounded-full blur-xl"></div>

              {/* Document reader mockup */}
              <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
                {/* Window chrome */}
                <div className="bg-secondary/40 px-4 py-2.5 flex items-center gap-3 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-1 text-center truncate pr-8">
                    The Great Office Chair Heist.pdf
                  </span>
                </div>

                {/* Document content */}
                <div className="p-5 space-y-3 max-h-48 overflow-hidden">
                  <h4 className="font-bold text-sm">The Great Office Chair Heist</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    It all started with an innocent desire for comfort. Ethan, a
                    junior developer at TechNova Inc.,{" "}
                    <span className="bg-primary/20 text-foreground rounded px-0.5">
                      had been suffering in silence—or rather, suffering in
                      squeaky discomfort.
                    </span>{" "}
                    His office chair was a relic from a bygone era, a testament
                    to the company&apos;s frugality.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed opacity-60">
                    Meanwhile, across the room, the company&apos;s senior developer,
                    Greg, sat like a king on a plush, ergonomic throne. It had
                    lumbar support, adjustable arms, and most importantly: wheels
                    that actually worked...
                  </p>
                </div>

                {/* TTS overlay / playback bar */}
                <div className="border-t border-border bg-secondary/20 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Karen · EN-AU
                      </span>
                    </div>
                    <span className="text-xs font-mono text-primary">1:24 / 8:30</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-secondary rounded-full mb-3 cursor-pointer">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-purple-500 rounded-full w-[17%]"></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                        <SkipBack className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                        <Pause className="h-4 w-4 text-white" />
                      </button>
                      <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                        <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full font-medium">
                      1.2×
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature badges */}
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                40+ Voices
              </div>
              <div className="absolute -bottom-3 -left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                100+ Languages
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-secondary/20 -z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          className="absolute bottom-0"
        >
          <path
            fill="currentColor"
            fillOpacity="0.05"
            d="M0,224L48,213.3C96,203,192,181,288,154.7C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </section>
  );
}
