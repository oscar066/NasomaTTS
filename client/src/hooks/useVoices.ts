/**
 * useVoices — voice catalogue loading.
 *
 * Fetches voices once and stores them in the global VoicesStore so subsequent
 * DocumentReader mounts skip the network round-trip entirely.
 */

import { useCallback } from "react";
import { voicesApi, Voice } from "@/lib/api";
import { useVoicesStore } from "@/store/voices";

export interface VoicesResult {
  voices: Voice[];
  voice: string;
  ttsAvailable: boolean;
  setVoice: (id: string) => void;
  fetchVoices: () => Promise<void>;
}

const getBrowserVoices = (): Voice[] => {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const bv = window.speechSynthesis.getVoices();
  if (bv.length === 0) return [{ id: "browser-default", label: "Browser TTS" }];

  const seen = new Set<string>();
  return bv
    .filter((v) => {
      if (seen.has(v.voiceURI)) return false;
      seen.add(v.voiceURI);
      return true;
    })
    .map((v) => ({ id: v.voiceURI, label: v.name }));
};

export const useVoices = (): VoicesResult => {
  const { voices, voice, ttsAvailable, fetched, setVoices, setVoice } =
    useVoicesStore();

  const fetchVoices = useCallback(async () => {
    // Skip if already fetched — voices don't change within a session.
    if (fetched) return;

    // 1. Prefer server-side NeuTTS voices.
    try {
      const { voices: serverVoices, tts_available } = await voicesApi.list();
      if (tts_available && serverVoices.length > 0) {
        setVoices(serverVoices, true);
        return;
      }
    } catch {
      // Server unavailable — fall through to browser TTS.
    }

    // 2. Browser Web Speech API fallback.
    const loadBrowser = () => {
      const bv = getBrowserVoices();
      setVoices(bv, false);
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length > 0) {
        loadBrowser();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          loadBrowser();
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(loadBrowser, 1000);
      }
    }
  }, [fetched, setVoices]);

  return { voices, voice, ttsAvailable, setVoice, fetchVoices };
};
