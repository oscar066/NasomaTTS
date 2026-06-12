import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import FadeIn from "@/app/components/ui/FadeIn";

const testimonials = [
  {
    quote:
      "Me Nasoma has completely changed how I consume content. I catch up on research papers during my morning run — something I never thought possible.",
    author: "Sarah Johnson",
    role: "Content Creator",
    company: "TechTalk Podcast",
    initials: "SJ",
    color: "#6366f1",
    topAccent: "from-violet-400 to-purple-500",
  },
  {
    quote:
      "As an educator, Me Nasoma has been instrumental in making our courses more accessible for students with visual impairments.",
    author: "Michael Chen",
    role: "Education Director",
    company: "LearnSmart",
    initials: "MC",
    color: "#0ea5e9",
    topAccent: "from-sky-400 to-blue-500",
  },
  {
    quote:
      "The multilingual support is incredible. I switch between English and Spanish papers seamlessly — the voices sound completely natural.",
    author: "Emma Rodriguez",
    role: "Research Scientist",
    company: "GlobalTech Solutions",
    initials: "ER",
    color: "#10b981",
    topAccent: "from-emerald-400 to-teal-500",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.06),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <FadeIn className="text-center mb-10 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Readers
            </span>
          </h2>
          <p className="text-base text-muted-foreground">
            Join thousands who have transformed how they consume content.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 100} className="h-full">
            <div
              className="relative h-full flex flex-col rounded-2xl bg-card border border-border overflow-hidden
                         hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Colorful top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${testimonial.topAccent}`} />

              <div className="p-8 flex flex-col flex-1">
                {/* Decorative quote mark */}
                <div className="absolute top-6 right-6 text-7xl leading-none font-serif text-border select-none">
                  &ldquo;
                </div>

                <StarRating />

                <p className="text-foreground/80 leading-relaxed flex-1 mb-8 text-sm relative z-10">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-6 border-t border-border">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: testimonial.color }}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role},{" "}
                      <span className="text-primary font-medium">{testimonial.company}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </FadeIn>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground
                       rounded-full hover:bg-primary/90 transition-all duration-200 font-semibold text-sm
                       shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Join Our Community
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
