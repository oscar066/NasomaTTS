import { Mic, Brain, Globe, Sliders } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Ultra-Realistic Voices",
    description:
      "Natural-sounding voices indistinguishable from human narration",
  },
  {
    icon: Brain,
    title: "AI Voice Customization",
    description: "Create custom voice profiles or choose from preset options",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Convert text to speech in over 50 languages",
  },
  {
    icon: Sliders,
    title: "Voice Controls",
    description: "Adjust emphasis, emotion, and pacing with ease",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background relative">
      {/* Add subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your reading experience with advanced text-to-speech
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border 
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 
                         transition-all duration-300 hover:scale-105"
            >
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 p-3 mb-4 
                            flex items-center justify-center group-hover:bg-primary/20 
                            transition-colors duration-300"
              >
                <feature.icon
                  className="h-6 w-6 text-primary group-hover:scale-110 
                                      transition-transform duration-300"
                />
              </div>

              <h3
                className="text-lg font-semibold mb-3 group-hover:text-primary 
                            transition-colors duration-300"
              >
                {feature.title}
              </h3>

              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
