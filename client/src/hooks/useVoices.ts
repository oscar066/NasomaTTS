/**
 * useVoices — voice catalogue loading.
 *
 * Always returns both Premium (Kokoro GPU) voices and Standard (browser native)
 * voices so the user can switch between them from the overlay selector.
 */

import { useCallback, useRef } from "react";
import { voicesApi, preferencesApi, Voice } from "@/lib/api";
import { useVoicesStore } from "@/store/voices";
import { prefs } from "@/lib/preferences";

export interface VoicesResult {
  voices: Voice[];
  voice: string;
  ttsAvailable: boolean;
  setVoice: (id: string) => void;
  fetchVoices: (token?: string) => Promise<void>;
}

const getBrowserVoices = (): Voice[] => {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const bv = window.speechSynthesis.getVoices();
  if (bv.length === 0) return [{ id: "browser-default", label: "Browser TTS", tier: "standard" }];

  const seen = new Set<string>();
  return bv
    .filter((v) => {
      if (seen.has(v.voiceURI)) return false;
      seen.add(v.voiceURI);
      return true;
    })
    .map((v) => ({ id: v.voiceURI, label: v.name, tier: "standard" as const }));
};

export const useVoices = (token?: string): VoicesResult => {
  const { voices, voice, ttsAvailable, fetched, setVoices, setVoice } =
    useVoicesStore();

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const fetchVoices = useCallback(async (runtimeToken?: string) => {
    if (fetched) return;

    const tk = runtimeToken ?? tokenRef.current;

    let premiumVoices: Voice[] = [];
    let serverAvailable = false;

    // 1. Try to get server-side Kokoro voices.
    try {
      const { voices: serverVoices, tts_available } = await voicesApi.list();
      if (tts_available && serverVoices.length > 0) {
        serverAvailable = true;
        premiumVoices = serverVoices.map((v) => ({ ...v, tier: "premium" as const }));

        // Restore server-saved voice preference.
        if (tk) {
          try {
            const { pref_voice, pref_speed } = await preferencesApi.load(tk);
            if (pref_voice) {
              const matched = premiumVoices.find((v) => v.id === pref_voice);
              if (matched) { prefs.setVoice(pref_voice); setVoice(pref_voice); }
            }
            if (pref_speed != null) prefs.setSpeed(pref_speed);
          } catch {}
        }
      }
    } catch {
      // Server unavailable — premium voices stay empty.
    }

    // 2. Always merge in browser native voices as Standard.
    const merge = (browserVoices: Voice[]) => {
      setVoices([...premiumVoices, ...browserVoices], serverAvailable);
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length > 0) {
        merge(getBrowserVoices());
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          merge(getBrowserVoices());
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(() => merge(getBrowserVoices()), 1000);
      }
    } else {
      // No browser TTS — just set whatever we got from the server.
      setVoices(premiumVoices, serverAvailable);
    }
  }, [fetched, setVoices, setVoice]);

  const setVoiceAndSync = useCallback((id: string) => {
    setVoice(id);
    const tk = tokenRef.current;
    if (tk) preferencesApi.save(id, null, tk).catch(() => {});
  }, [setVoice]);

  return { voices, voice, ttsAvailable, setVoice: setVoiceAndSync, fetchVoices };
};
