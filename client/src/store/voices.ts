import { create } from "zustand";
import { Voice } from "@/lib/api";
import { prefs } from "@/lib/preferences";

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

  setVoices: (voices, ttsAvailable) => {
    const saved   = prefs.getVoice();
    const matched = saved ? voices.find((v) => v.id === saved) : null;
    const voice   = matched ? matched.id : (voices[0]?.id ?? "");
    set({ voices, ttsAvailable, voice, fetched: true });
  },

  setVoice: (voice) => {
    prefs.setVoice(voice);
    set({ voice });
  },
}));
