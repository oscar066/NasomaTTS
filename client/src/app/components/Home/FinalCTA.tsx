import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">
          Experience the Future of Speech Synthesis Today!
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join thousands of satisfied users and transform your text into
          lifelike speech with VoxAI.
        </p>
        <Link href="/auth/signup/" passHref>
          <Button size="lg" variant="secondary">
            Sign Up for Free
          </Button>
        </Link>
      </div>
    </section>
  );
}
