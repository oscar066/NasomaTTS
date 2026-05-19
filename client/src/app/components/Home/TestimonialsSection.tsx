import Link from "next/link";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "Nasoma has completely changed how I consume content. I catch up on research papers during my morning run — something I never thought possible.",
    author: "Sarah Johnson",
    role: "Content Creator",
    company: "TechTalk Podcast",
    initials: "SJ",
    color: "#6366f1",
  },
  {
    quote:
      "As an educator, Nasoma has been instrumental in making our courses more accessible for students with visual impairments.",
    author: "Michael Chen",
    role: "Education Director",
    company: "LearnSmart",
    initials: "MC",
    color: "#0ea5e9",
  },
  {
    quote:
      "The multilingual support is incredible. I switch between English and Spanish papers seamlessly — the voices sound completely natural.",
    author: "Emma Rodriguez",
    role: "Research Scientist",
    company: "GlobalTech Solutions",
    initials: "ER",
    color: "#10b981",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Loved by Readers</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands who have transformed how they consume content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 rounded-xl bg-card border border-border hover:border-primary/50
                         transition-all duration-300 hover:shadow-lg flex flex-col"
            >
              <StarRating />

              <p className="text-muted-foreground leading-relaxed flex-1 mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className="flex items-center pt-6 border-t border-border">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: testimonial.color }}
                >
                  {testimonial.initials}
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role},{" "}
                    <span className="text-primary">{testimonial.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/auth/signup"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground
                       rounded-full hover:bg-primary/90 transition-colors font-medium"
          >
            Join Our Community
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
