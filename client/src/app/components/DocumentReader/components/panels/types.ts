export type ActionKey = "chat" | "summary" | "quiz" | "recap";

export interface PanelMeta {
  title: string;
  description: string;
}

export const PANEL_META: Record<ActionKey, PanelMeta> = {
  chat:    { title: "Chat with your document",  description: "Ask questions and explore ideas from the text."        },
  summary: { title: "Document summary",         description: "A concise overview of the key points and themes."      },
  quiz:    { title: "Knowledge quiz",           description: "Test your understanding with AI-generated questions."  },
  recap:   { title: "Reading recap",            description: "Pick up where you left off with a quick catch-up."     },
};
