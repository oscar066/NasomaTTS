import { Mic, Brain, Globe, Sliders, FileText, Download } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Ultra-Realistic Voices",
    description:
      "40+ natural-sounding voices across accents and languages — indistinguishable from human narration.",
  },
  {
    icon: FileText,
    title: "PDF & Document Support",
    description:
      "Upload PDFs, articles, and text files. Nasoma extracts and reads them cleanly, handling formatting intelligently.",
  },
  {
    icon: Globe,
    title: "100+ Languages",
    description:
      "Listen in your native language or practice a new one. Full multilingual support with region-specific accents.",
  },
  {
    icon: Sliders,
    title: "Playback Controls",
    description:
      "Adjust speed from 0.5× to 3×, skip forward, rewind, and pick up exactly where you left off.",
  },
  {
    icon: Brain,
    title: "Smart Highlighting",
    description:
      "Follow along as each sentence is highlighted in real time, keeping your place and making it easy to re-read.",
  },
  {
    icon: Download,
    title: "Your Personal Library",
    description:
      "All your documents in one place. Upload once, listen anytime — your library is always synced and ready.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make listening effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
                         transition-all duration-300 hover:scale-[1.02]"
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
