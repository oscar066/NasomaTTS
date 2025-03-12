import Image from "next/image";

const testimonials = [
  {
    quote:
      "Nasoma has transformed how I consume content. I can finally catch up on articles while commuting.",
    author: "Sarah Johnson",
    role: "Content Creator",
    company: "TechTalk Podcast",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    quote:
      "As an educator, Nasoma has been instrumental in making our courses more accessible.",
    author: "Michael Chen",
    role: "Education Director",
    company: "LearnSmart",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    quote:
      "The multilingual support has helped me stay connected with international research.",
    author: "Emma Rodriguez",
    role: "Research Scientist",
    company: "GlobalTech Solutions",
    avatar: "/placeholder.svg?height=80&width=80",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of readers who have transformed their content
            experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 rounded-xl bg-card border border-border hover:border-primary/50 
                         transition-all duration-300 hover:shadow-lg"
            >
              <p className="text-muted-foreground text-lg mb-6 italic">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center pt-6 border-t border-border">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="ml-4">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role},{" "}
                    <span className="text-primary">{testimonial.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="#join"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground 
                       rounded-full hover:opacity-90 transition-opacity"
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
          </a>
        </div>
      </div>
    </section>
  );
}
