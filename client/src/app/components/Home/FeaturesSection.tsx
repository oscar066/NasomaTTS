import { Mic, Globe, Sliders, FileText } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Ultra-Realistic Voices",
    description: "AI-driven voices that sound human.",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Convert text into speech in over 50 languages.",
  },
  {
    icon: Sliders,
    title: "Custom Voice & Speed Control",
    description:
      "Adjust tone, speed, and emotion for a personalized experience.",
  },
  {
    icon: FileText,
    title: "Document & API Integration",
    description:
      "Seamlessly convert PDFs, web pages, and use our API for automation.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Powerful Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg transition-transform hover:scale-105"
            >
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
