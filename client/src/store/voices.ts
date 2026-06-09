import { create } from "zustand";
import { Voice } from "@/lib/api";

interface VoicesStore {
  voices: Voice[];
  voice: string;
  ttsAvailable: boolean;
  /** True once fetchVoices has completed at least once. */
  fetched: boolean;
  setVoices: (voices: Voice[], ttsAvailable: boolean) => void;
  setVoice: (id: string) => void;
}

export const useVoicesStore = create<VoicesStore>((set) => ({
  voices: [],
  voice: "",
  ttsAvailable: false,
  fetched: false,

  setVoices: (voices, ttsAvailable) =>
    set({ voices, ttsAvailable, voice: voices[0]?.id ?? "", fetched: true }),

  setVoice: (voice) => set({ voice }),
}));
