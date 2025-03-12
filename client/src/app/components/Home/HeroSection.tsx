// Hero Section Component
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Headphones, Laptop, Globe } from "lucide-react";
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

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              <span className="text-transparent">Turn Reading Into</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Listening Freedom
              </span>
            </h1>

            <p className="text-lg mb-8 text-muted-foreground leading-relaxed">
              Nasoma transforms any text into natural, engaging audio that fits
              your life. Listen to articles, books, and documents in lifelike
              voices while you commute, exercise, or relax — saving time and
              reducing eye strain.
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
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-primary/20 hover:border-primary/50 shadow-sm"
              >
                <Play className="mr-2 h-4 w-4 text-primary" /> Hear Examples
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-gray-300 border-2 border-background"
                  ></div>
                ))}
              </div>
              <span>
                Trusted by{" "}
                <span className="font-medium text-foreground">12,000+</span>{" "}
                readers worldwide
              </span>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -z-10 -top-6 -left-6 w-64 h-64 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute -z-10 -bottom-6 -right-6 w-64 h-64 bg-purple-500/5 rounded-full blur-xl"></div>

              {/* Device mockup */}
              <div className="bg-background border border-border rounded-2xl shadow-2xl p-4 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span className="font-medium">Now Playing</span>
                  </div>
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    02:14 / 15:30
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-2">
                    Why Deep Work Matters in a Distracted World
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    In today's constantly connected environment, the ability to
                    focus deeply on cognitively demanding tasks becomes
                    increasingly valuable...
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                      <Play className="h-4 w-4" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                      <Headphones className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-1 items-center text-xs font-medium">
                    <Globe className="h-3 w-3 text-primary" />
                    <span>EN-AU</span>
                    <span className="text-muted-foreground mx-1">|</span>
                    <span>Karen</span>
                  </div>
                </div>
              </div>

              {/* Feature badges */}
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                NEW: 40+ Voices
              </div>
              <div className="absolute -bottom-3 -left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
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
