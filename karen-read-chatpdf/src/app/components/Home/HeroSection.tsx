import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
          Transform Text into Lifelike Speech with AI
        </h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto text-muted-foreground">
          Convert text into natural-sounding speech across multiple languages
          and accents. Experience the power of AI-driven voice synthesis.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="/auth/signup" passHref>
            <Button size="lg" className="w-full sm:w-auto">
              Get Started for Free
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <Play className="mr-2 h-4 w-4" /> Listen to Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
