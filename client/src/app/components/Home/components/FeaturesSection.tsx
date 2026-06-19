import { Mic, Brain, Globe, Sliders, MessageSquare, FileText, HelpCircle, History } from "lucide-react";
import FadeIn from "@/app/components/ui/FadeIn";

const features = [
  {
    icon: Brain,
    title: "Synchronized Read-Along",
    description:
      "Audio and highlighting move in sync, word by word. Eyes and ears together, distractions drop, focus holds, more sticks.",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    borderHover: "hover:border-emerald-200 dark:hover:border-emerald-900",
    shadowHover: "hover:shadow-emerald-100 dark:hover:shadow-emerald-950",
  },
  {
    icon: MessageSquare,
    title: "Chat With Your Document",
    description:
      "Ask anything about what you are reading: characters, themes, concepts, or specific passages. Get instant answers without leaving the page.",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    borderHover: "hover:border-violet-200 dark:hover:border-violet-900",
    shadowHover: "hover:shadow-violet-100 dark:hover:shadow-violet-950",
  },
  {
    icon: FileText,
    title: "Instant AI Summary",
    description:
      "Get a concise overview of any document in seconds. Understand the key points before you dive in or refresh your memory after.",
    iconBg: "bg-gradient-to-br from-sky-500 to-cyan-600",
    borderHover: "hover:border-sky-200 dark:hover:border-sky-900",
    shadowHover: "hover:shadow-sky-100 dark:hover:shadow-sky-950",
  },
  {
    icon: HelpCircle,
    title: "Comprehension Quiz",
    description:
      "Auto-generated questions test what you have absorbed. A simple way to turn passive reading into active learning.",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-500",
    borderHover: "hover:border-orange-200 dark:hover:border-orange-900",
    shadowHover: "hover:shadow-orange-100 dark:hover:shadow-orange-950",
  },
  {
    icon: History,
    title: "Reading Recap",
    description:
      "Pick up right where you left off. AI catches you up on everything you have read so far: characters, events, key ideas.",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
    borderHover: "hover:border-rose-200 dark:hover:border-rose-900",
    shadowHover: "hover:shadow-rose-100 dark:hover:shadow-rose-950",
  },
  {
    icon: Sliders,
    title: "Read More, Faster",
    description:
      "Dial speed from 0.5× to 3×. Your pace grows naturally. More material, less time, no rush.",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    borderHover: "hover:border-blue-200 dark:hover:border-blue-900",
    shadowHover: "hover:shadow-blue-100 dark:hover:shadow-blue-950",
  },
  {
    icon: Mic,
    title: "Natural, Human-Like Voices",
    description:
      "40+ voices across accents and styles, lifelike enough to keep you engaged through a 100-page report.",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600",
    borderHover: "hover:border-indigo-200 dark:hover:border-indigo-900",
    shadowHover: "hover:shadow-indigo-100 dark:hover:shadow-indigo-950",
  },
  {
    icon: Globe,
    title: "100+ Languages",
    description:
      "Read in your native language or practice a new one. Region-specific accents, full multilingual support.",
    iconBg: "bg-gradient-to-br from-teal-500 to-green-600",
    borderHover: "hover:border-teal-200 dark:hover:border-teal-900",
    shadowHover: "hover:shadow-teal-100 dark:hover:shadow-teal-950",
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            Built to Help You{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Read Better
            </span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Every feature is built around one goal: concentrate, comprehend, and cover more.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
