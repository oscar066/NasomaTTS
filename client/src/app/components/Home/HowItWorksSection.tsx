import { Upload, Cpu, Headphones } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Your Document",
    description:
      "Import any PDF, article, or text file. Nasoma accepts all major document formats in seconds.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Narrates It",
    description:
      "Our text-to-speech engine processes your content and renders it in a natural, lifelike voice of your choice.",
  },
  {
    step: "03",
    icon: Headphones,
    title: "Listen Anywhere",
    description:
      "Stream instantly in the browser or download the audio. Your library is always with you.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From document to audio in three simple steps.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-14 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s, index) => (
              <div key={index} className="flex flex-col items-center text-center relative">
                {/* Step number bubble */}
                <div className="relative mb-5 z-10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary text-[10px] font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
