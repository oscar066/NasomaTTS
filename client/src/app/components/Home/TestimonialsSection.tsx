import Image from "next/image";

const testimonials = [
  {
    quote:
      "VoxAI has revolutionized our content creation process. The natural-sounding voices have significantly improved our podcast production.",
    author: "Sarah Johnson",
    role: "Content Creator",
    company: "TechTalk Podcast",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    quote:
      "As an e-learning platform, VoxAI has been instrumental in making our courses more accessible to visually impaired students.",
    author: "Michael Chen",
    role: "Education Director",
    company: "LearnSmart",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    quote:
      "The multilingual support has helped us expand our market reach. We now create voiceovers for our product videos in multiple languages with ease.",
    author: "Emma Rodriguez",
    role: "Marketing Manager",
    company: "GlobalTech Solutions",
    avatar: "/placeholder.svg?height=80&width=80",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          What Our Customers Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card p-6 rounded-lg shadow-md transition-transform hover:scale-105"
            >
              <p className="text-muted-foreground mb-4 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center">
                <Image
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.author}
                  width={40}
                  height={40}
                  className="rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold text-card-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
