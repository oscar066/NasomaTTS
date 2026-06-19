"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Search,
  BookOpen,
  Mic,
  Brain,
  Mail,
  MessageSquare,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Sidebar from "@/app/components/Dashboard/SideBar";
import { TopBar } from "@/app/components/Dashboard/TopBar";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  icon: React.ElementType;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        q: "How do I upload a document?",
        a: "Click the \"Upload PDF\" button in the sidebar or the \"Upload your first PDF\" button on the dashboard. Select a PDF file from your device and Me Nasoma will process it automatically.",
      },
      {
        q: "What file types are supported?",
        a: "Currently Me Nasoma supports PDF files. Support for additional formats is coming soon.",
      },
      {
        q: "How do I start reading a document?",
        a: "Click on any document card in your library to open the reader. Press the play button to start audio playback. Words are highlighted in sync as the document is read aloud.",
      },
      {
        q: "Is there a limit to how many documents I can upload?",
        a: "Free plan users can upload up to 10 documents. Pro plan users enjoy unlimited document storage.",
      },
    ],
  },
  {
    title: "Audio and Voices",
    icon: Mic,
    items: [
      {
        q: "How many voices are available?",
        a: "Free plan includes 5 natural-sounding voices. Pro plan unlocks 40+ premium voices and accents from around the world.",
      },
      {
        q: "What languages does Me Nasoma support?",
        a: "Me Nasoma supports 100+ languages. You can select your preferred language and voice from the settings panel inside the document reader.",
      },
      {
        q: "Can I adjust the reading speed?",
        a: "Yes. Use the speed control in the playback bar to increase or decrease the reading pace to whatever is comfortable for you.",
      },
      {
        q: "Can I download the audio?",
        a: "High quality audio download is available on the Pro plan. Free plan users can listen in-browser but cannot export audio files.",
      },
    ],
  },
  {
    title: "AI Features",
    icon: Brain,
    items: [
      {
        q: "What AI tools does Me Nasoma include?",
        a: "Me Nasoma comes with four AI tools: Chat with your document (ask questions about the content), Instant AI Summary (get a concise overview), Comprehension Quiz (test your understanding), and Reading Recap (review key points after you finish).",
      },
      {
        q: "Are AI features available on the free plan?",
        a: "AI features are a Pro-only benefit. Upgrade to Pro to unlock Chat, Summary, Quiz, and Recap tools.",
      },
      {
        q: "How does \"Chat with Document\" work?",
        a: "The AI reads and indexes your document. You can then ask it questions in plain language and it will answer using the content of that specific document.",
      },
      {
        q: "How accurate is the AI Summary?",
        a: "The summary is generated from your document directly and covers the main ideas and key points. For best results, ensure the PDF has selectable text rather than being a scanned image.",
      },
    ],
  },
  {
    title: "Account and Billing",
    icon: MessageSquare,
    items: [
      {
        q: "What is the difference between Free and Pro?",
        a: "Free gives you up to 10 documents, 5 voices, and standard playback with no AI features. Pro gives you unlimited documents, 40+ premium voices, all AI tools, high quality audio download, and priority support.",
      },
      {
        q: "How do I upgrade to Pro?",
        a: "Click \"Upgrade\" in the sidebar or visit the Pricing section from the landing page. Select the Pro plan and complete checkout.",
      },
      {
        q: "Can I change my password?",
        a: "Yes. Go to Settings from the sidebar or your user menu, then open the \"Account Settings\" tab to update your password.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings, open the \"Account Settings\" tab, and scroll to the Danger Zone section. Click \"Delete Account\" and confirm. This action is permanent and cannot be undone.",
      },
    ],
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-border">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
          >
            <span>{item.q}</span>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === i && (
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function HelpPage() {
  const { status } = useSession({ required: true });
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const query = searchQuery.toLowerCase().trim();
  const filteredSections = query
    ? faqSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.q.toLowerCase().includes(query) ||
              item.a.toLowerCase().includes(query)
          ),
        }))
        .filter((section) => section.items.length > 0)
    : faqSections;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Help and Support</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Find answers, learn features, or get in touch.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search for answers..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick links */}
            {!query && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {[
                  {
                    icon: BookOpen,
                    title: "Getting Started",
                    desc: "Upload your first document and start reading.",
                    onClick: () =>
                      document
                        .getElementById("section-Getting Started")
                        ?.scrollIntoView({ behavior: "smooth" }),
                  },
                  {
                    icon: Brain,
                    title: "AI Features",
                    desc: "Chat, summarize, quiz, and recap your reading.",
                    onClick: () =>
                      document
                        .getElementById("section-AI Features")
                        ?.scrollIntoView({ behavior: "smooth" }),
                  },
                  {
                    icon: Mail,
                    title: "Contact Support",
                    desc: "Still stuck? We are happy to help.",
                    onClick: () =>
                      (window.location.href = "mailto:support@menasoma.com"),
                  },
                ].map(({ icon: Icon, title, desc, onClick }) => (
                  <button
                    key={title}
                    onClick={onClick}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* FAQ sections */}
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No results for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different term or{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() =>
                      (window.location.href = "mailto:support@menasoma.com")
                    }
                  >
                    contact support
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredSections.map(({ title, icon: Icon, items }) => (
                  <div
                    key={title}
                    id={`section-${title}`}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 px-5 py-4 bg-muted/50 border-b border-border">
                      <Icon className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">{title}</h2>
                    </div>
                    <div className="px-5">
                      <FaqAccordion items={items} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contact footer */}
            {!query && (
              <div className="mt-10 flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Still need help?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send us a message and we will get back to you within 24 hours.
                  </p>
                </div>
                <a
                  href="mailto:support@menasoma.com"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline flex-shrink-0 mt-0.5"
                >
                  Email us <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
