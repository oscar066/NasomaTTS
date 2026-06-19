const VOICE_KEY = "nasoma_pref_voice";
const SPEED_KEY = "nasoma_pref_speed";

export const prefs = {
  getVoice: (): string | null => {
    try { return localStorage.getItem(VOICE_KEY); } catch { return null; }
  },
  setVoice: (id: string): void => {
    try { localStorage.setItem(VOICE_KEY, id); } catch {}
  },
  getSpeed: (): number => {
    try {
      const raw = localStorage.getItem(SPEED_KEY);
      if (!raw) return 1;
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : 1;
    } catch { return 1; }
  },
  setSpeed: (speed: number): void => {
    try { localStorage.setItem(SPEED_KEY, String(speed)); } catch {}
  },
};
