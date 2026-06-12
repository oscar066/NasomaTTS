import { Mic, Brain, Globe, Sliders, FileText, Download } from "lucide-react";
import FadeIn from "@/app/components/ui/FadeIn";

const features = [
  {
    icon: Mic,
    title: "Ultra-Realistic Voices",
    description:
      "40+ natural-sounding voices across accents and languages — indistinguishable from human narration.",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    borderHover: "hover:border-violet-200 dark:hover:border-violet-900",
    shadowHover: "hover:shadow-violet-100 dark:hover:shadow-violet-950",
  },
  {
    icon: FileText,
    title: "PDF & Document Support",
    description:
      "Upload PDFs, articles, and text files. Me Nasoma extracts and reads them cleanly, handling formatting intelligently.",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    borderHover: "hover:border-blue-200 dark:hover:border-blue-900",
    shadowHover: "hover:shadow-blue-100 dark:hover:shadow-blue-950",
  },
  {
    icon: Globe,
    title: "100+ Languages",
    description:
      "Listen in your native language or practice a new one. Full multilingual support with region-specific accents.",
    iconBg: "bg-gradient-to-br from-sky-500 to-cyan-600",
    borderHover: "hover:border-sky-200 dark:hover:border-sky-900",
    shadowHover: "hover:shadow-sky-100 dark:hover:shadow-sky-950",
  },
  {
    icon: Sliders,
    title: "Playback Controls",
    description:
      "Adjust speed from 0.5× to 3×, skip forward, rewind, and pick up exactly where you left off.",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-500",
    borderHover: "hover:border-orange-200 dark:hover:border-orange-900",
    shadowHover: "hover:shadow-orange-100 dark:hover:shadow-orange-950",
  },
  {
    icon: Brain,
    title: "Smart Highlighting",
    description:
      "Follow along as each sentence is highlighted in real time, keeping your place and making it easy to re-read.",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    borderHover: "hover:border-emerald-200 dark:hover:border-emerald-900",
    shadowHover: "hover:shadow-emerald-100 dark:hover:shadow-emerald-950",
  },
  {
    icon: Download,
    title: "Your Personal Library",
    description:
      "All your documents in one place. Upload once, listen anytime — your library is always synced and ready.",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
    borderHover: "hover:border-rose-200 dark:hover:border-rose-900",
    shadowHover: "hover:shadow-rose-100 dark:hover:shadow-rose-950",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.07),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <FadeIn className="text-center mb-10 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Everything{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              You Need
            </span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Powerful features designed to make listening effortless.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 80} className="h-full">
            <div
              className={`group h-full flex flex-col p-7 rounded-2xl bg-card border border-border
                         ${feature.borderHover} hover:shadow-xl ${feature.shadowHover}
                         transition-all duration-300 hover:-translate-y-1`}
            >
              <div
                className={`w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>

              <h3 className="text-base font-semibold mb-2.5 text-foreground group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {feature.description}
              </p>
            </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
