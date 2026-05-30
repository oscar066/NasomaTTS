/**
 * useVoices — voice catalogue loading.
 *
 * Single responsibility: discover which TTS voices are available and expose a
 * setter so the user can switch between them.
 *
 * Strategy
 * ────────
 * 1. Try the NeuTTS API (`GET /voices`).  If it returns at least one voice the
 *    application is in "server TTS" mode and `ttsAvailable` is `true`.
 * 2. On failure (backend offline, NeuTTS not loaded) fall back to the browser's
 *    Web Speech API (`window.speechSynthesis`).  Chromium browsers populate the
 *    voice list asynchronously via the `voiceschanged` event, so we register a
 *    one-time listener and also schedule a 1-second fallback timer for browsers
 *    that never fire the event.
 * 3. Duplicate `voiceURI` values (Brave/Chromium registers "Samantha" and
 *    other voices multiple times for different locales) are deduplicated so
 *    React never receives a list with duplicate keys.
 */

import { useState, useCallback } from "react";
import { voicesApi, Voice } from "@/lib/api";

export interface VoicesResult {
  voices: Voice[];
  voice: string;
  ttsAvailable: boolean;
  setVoice: (id: string) => void;
  /** Call once on mount to populate the voice list. */
  fetchVoices: () => Promise<void>;
}

interface VoicesState {
  voices: Voice[];
  voice: string;
  ttsAvailable: boolean;
}

export const useVoices = (): VoicesResult => {
  const [state, setState] = useState<VoicesState>({
    voices: [],
    voice: "",
    ttsAvailable: false,
  });

  const update = (patch: Partial<VoicesState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ── Browser voice helpers

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

  // ── Main fetch

  const fetchVoices = useCallback(async () => {
    // 1. Prefer server-side NeuTTS voices.
    try {
      const { voices, tts_available } = await voicesApi.list();
      if (tts_available && voices.length > 0) {
        update({ voices, voice: voices[0].id, ttsAvailable: true });
        return;
      }
    } catch {
      // Server unavailable — fall through to browser TTS.
    }

    // 2. Browser Web Speech API fallback.
    const loadBrowser = () => {
      const bv = getBrowserVoices();
      update({ voices: bv, voice: bv[0]?.id ?? "", ttsAvailable: false });
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length > 0) {
        loadBrowser();
      } else {
        // Chromium populates voices asynchronously.
        window.speechSynthesis.onvoiceschanged = () => {
          loadBrowser();
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(loadBrowser, 1000);
      }
    }
  }, []);

  return {
    voices: state.voices,
    voice: state.voice,
    ttsAvailable: state.ttsAvailable,
    setVoice: (voice: string) => update({ voice }),
    fetchVoices,
  };
};
