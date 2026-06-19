import { create } from "zustand";
import { Document } from "@/lib/api";

interface DocumentsStore {
  documents: Document[];
  /** True once the list has been fetched at least once for the current session. */
  isLoaded: boolean;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  reset: () => void;
  /** IDs of notifications the user has dismissed this session. */
  readNotificationIds: string[];
  markNotificationRead: (id: string) => void;
}

export const useDocumentsStore = create<DocumentsStore>((set) => ({
  documents: [],
  isLoaded: false,

  setDocuments: (documents) => set({ documents, isLoaded: true }),

  addDocument: (doc) =>
    set((s) => ({ documents: [doc, ...s.documents] })),

  updateDocument: (id, patch) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  // Call on sign-out so a new user doesn't briefly see stale data.
  reset: () => set({ documents: [], isLoaded: false, readNotificationIds: [] }),

  readNotificationIds: [],
  markNotificationRead: (id) =>
    set((s) => ({
      readNotificationIds: s.readNotificationIds.includes(id)
        ? s.readNotificationIds
        : [...s.readNotificationIds, id],
    })),
}));
