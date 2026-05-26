// Typed REST client for the FastAPI backend.
// All functions throw on non-2xx responses so callers can catch normally.

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (body: { username: string; email: string; password: string }) =>
    request<{ token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  signin: (body: { email: string; password: string }) =>
    request<{ token: string }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: (token: string) =>
    request<{ id: string; username: string; email: string; avatar: string }>(
      "/auth/me",
      {},
      token
    ),
};

// ── Documents ───────────────────────────────────────────────────────────────

export interface StoredPage {
  page_number: number;
  text: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  pdf_url?: string | null;
  pages?: StoredPage[] | null;
  author: { id: string; username: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const documentsApi = {
  list: (token: string) =>
    request<Document[]>("/documents/", {}, token),

  mine: (token: string) =>
    request<Document[]>("/documents/me", {}, token),

  byAuthor: (email: string, token: string) =>
    request<Document[]>(`/documents/by-author/${encodeURIComponent(email)}`, {}, token),

  get: (id: string, token?: string) =>
    request<Document>(`/documents/${id}`, {}, token),

  create: (body: { title: string; content: string; pdf_url?: string | null; pages?: StoredPage[] | null }, token: string) =>
    request<Document>("/documents/", {
      method: "POST",
      body: JSON.stringify(body),
    }, token),

  delete: (id: string, token: string) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: "DELETE" }, token),
};

// ── PDF ─────────────────────────────────────────────────────────────────────

export const pdfApi = {
  upload: (file: File, token: string) => {
    const form = new FormData();
    form.append("pdf", file);
    return request<{ title: string; content: string; pdf_url: string | null; pages: StoredPage[]; message: string }>(
      "/pdf/upload",
      { method: "POST", body: form },
      token
    );
  },
};

// ── Voices ──────────────────────────────────────────────────────────────────

export interface Voice {
  id: string;
  label: string;
}

export const voicesApi = {
  list: () =>
    request<{ voices: Voice[]; tts_available: boolean }>("/voices/"),
};

// ── PDF proxy ────────────────────────────────────────────────────────────────

export function pdfProxyUrl(docId: string): string {
  return `${BASE}/pdf/${docId}`;
}

// ── Speak (POST → streaming SSE response) ────────────────────────────────────
// Using POST avoids URL-length limits that break long documents with GET params.

export function speakStream(
  text: string,
  voice: string,
  wpm: number,
  signal: AbortSignal
): Promise<Response> {
  return fetch(`${BASE}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, wpm }),
    signal,
  });
}
