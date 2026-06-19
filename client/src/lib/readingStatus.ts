import { Bookmark, BookOpen, CheckCircle2, Clock, type LucideIcon } from "lucide-react";

export type ReadingStatus = "want_to_read" | "reading" | "finished" | "read_later";

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  glow: string;
}

export const STATUS_META: Record<ReadingStatus, StatusMeta> = {
  want_to_read: {
    label:  "Want to Read",
    icon:   Bookmark,
    color:  "text-blue-500",
    bg:     "bg-blue-500/15",
    border: "border border-blue-500/40",
    glow:   "shadow-[0_0_10px_rgba(59,130,246,0.45)]",
  },
  reading: {
    label:  "Currently Reading",
    icon:   BookOpen,
    color:  "text-amber-500",
    bg:     "bg-amber-500/15",
    border: "border border-amber-500/40",
    glow:   "shadow-[0_0_10px_rgba(245,158,11,0.45)]",
  },
  finished: {
    label:  "Finished",
    icon:   CheckCircle2,
    color:  "text-green-500",
    bg:     "bg-green-500/15",
    border: "border border-green-500/40",
    glow:   "shadow-[0_0_10px_rgba(34,197,94,0.45)]",
  },
  read_later: {
    label:  "Read Later",
    icon:   Clock,
    color:  "text-purple-500",
    bg:     "bg-purple-500/15",
    border: "border border-purple-500/40",
    glow:   "shadow-[0_0_10px_rgba(168,85,247,0.45)]",
  },
};

export const STATUSES = Object.keys(STATUS_META) as ReadingStatus[];

const STORAGE_KEY = "nasoma_reading_status";

function load(): Record<string, ReadingStatus> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getStatus(docId: string): ReadingStatus | null {
  return load()[docId] ?? null;
}

export function setStatus(docId: string, status: ReadingStatus | null): void {
  const map = load();
  if (status === null) {
    delete map[docId];
  } else {
    map[docId] = status;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
