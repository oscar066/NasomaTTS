import { Upload, Cpu, BookOpen } from "lucide-react";
import FadeIn from "@/app/components/ui/FadeIn";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Your Document",
    description:
      "Import any PDF, article, or text file. Structure, headings, and all, parsed in seconds.",
    accent: "from-primary to-indigo-600",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Reads With You",
    description:
      "A lifelike voice narrates while each sentence highlights in real time. Eyes and ears, in sync.",
    accent: "from-violet-500 to-purple-600",
  },
  {
    step: "03",
    icon: BookOpen,
    title: "Concentrate, Comprehend, Cover More",
    description:
      "Stay focused, absorb deeply, and actually get through your reading list.",
    accent: "from-purple-600 to-pink-600",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 bg-background relative overflow-hidden">

      <div className="container mx-auto px-4 relative">
        <FadeIn className="text-center mb-10 max-w-xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full">
            How It Works
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            How Me Nasoma{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-base text-muted-foreground">
            From document to deep understanding in three steps.
          </p>
        </FadeIn>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-[3.25rem] left-[calc(16.66%+3rem)] right-[calc(16.66%+3rem)] h-px">
            <div className="w-full h-full bg-gradient-to-r from-primary/40 via-violet-500/60 to-purple-600/40" />
            {/* Arrow dots */}
            <div className="absolute left-1/3 -translate-x-1/2 -top-1 w-2 h-2 rounded-full bg-violet-400" />
            <div className="absolute right-1/3 translate-x-1/2 -top-1 w-2 h-2 rounded-full bg-violet-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, index) => (
              <FadeIn key={index} delay={index * 120} className="h-full">
              <div
                className="group h-full flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 relative"
              >
                {/* Step icon */}
                <div className="relative mb-6 z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-base font-semibold mb-2.5 group-hover:text-primary transition-colors duration-300">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {s.description}
                </p>
              </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
