/**
 * useVoices — voice catalogue loading.
 *
 * Fetches voices once and stores them in the global VoicesStore so subsequent
 * DocumentReader mounts skip the network round-trip entirely.
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

export const useVoices = (token?: string): VoicesResult => {
  const { voices, voice, ttsAvailable, fetched, setVoices, setVoice } =
    useVoicesStore();

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const fetchVoices = useCallback(async (runtimeToken?: string) => {
    if (fetched) return;

    const tk = runtimeToken ?? tokenRef.current;

    // 1. Prefer server-side NeuTTS voices.
    try {
      const { voices: serverVoices, tts_available } = await voicesApi.list();
      if (tts_available && serverVoices.length > 0) {
        setVoices(serverVoices, true);

        // Load server preference and override localStorage if found.
        if (tk) {
          try {
            const { pref_voice, pref_speed } = await preferencesApi.load(tk);
            if (pref_voice) {
              const matched = serverVoices.find((v) => v.id === pref_voice);
              if (matched) { prefs.setVoice(pref_voice); setVoice(pref_voice); }
            }
            if (pref_speed != null) prefs.setSpeed(pref_speed);
          } catch {}
        }
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
  }, [fetched, setVoices, setVoice]);

  const setVoiceAndSync = useCallback((id: string) => {
    setVoice(id);
    const tk = tokenRef.current;
    if (tk) preferencesApi.save(id, null, tk).catch(() => {});
  }, [setVoice]);

  return { voices, voice, ttsAvailable, setVoice: setVoiceAndSync, fetchVoices };
};
