// Typed REST client for the FastAPI backend.
// All functions throw on non-2xx responses so callers can catch normally.

// Server-side uses API_URL (internal Docker network name).
// Browser uses NEXT_PUBLIC_API_URL (/api), which nginx rewrites in production
// and Next.js rewrites proxy locally.
const BASE =
  typeof window === "undefined"
    ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

// ── Auth

export const authApi = {
  signup: (body: { username: string; email: string; password: string }) =>
    request<{ id: string; email: string; username: string; is_active: boolean }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(body) }
    ),

  // FastAPI Users login uses OAuth2 form data: field name "username" holds the email.
  signin: (body: { email: string; password: string }) => {
    const params = new URLSearchParams();
    params.set("username", body.email);
    params.set("password", body.password);
    return request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: params.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  me: (token: string) =>
    request<{ id: string; username: string; email: string; avatar: string; plan: string }>(
      "/users/me",
      {},
      token
    ),

  googleAuth: (idToken: string) =>
    request<{ access_token: string; token_type: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),

  forgotPassword: (email: string) =>
    request<null>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<null>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  requestVerification: (email: string) =>
    request<null>("/auth/request-verify-token", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyEmail: (token: string) =>
    request<{ id: string; email: string; is_verified: boolean }>(
      "/auth/verify",
      { method: "POST", body: JSON.stringify({ token }) }
    ),
};

// ── Documents

export interface StoredParagraph {
  text: string;
  /**
   * Bounding box in PDF user-space coordinates [x0, y0, x1, y1] (points at
   * 72 DPI, origin at top-left of the page).  Present for documents uploaded
   * after coordinate-overlay highlighting was introduced; undefined for legacy
   * paragraphs.
   */
  bbox?: [number, number, number, number];
}

export interface StoredPage {
  page_number: number;
  text: string;
  /** Native PDF page width in points (72 DPI). Used to scale bbox overlays. */
  width?: number;
  /** Native PDF page height in points (72 DPI). */
  height?: number;
  /** Paragraph blocks extracted by PyMuPDF. Present for documents uploaded
   *  after paragraph-level TTS was introduced; undefined for legacy docs. */
  paragraphs?: StoredParagraph[];
}

export interface Document {
  id: string;
  title: string;
  content: string;
  pdf_url?: string | null;
  thumbnail_url?: string | null;
  pages?: StoredPage[] | null;
  /** Last page the user reached (0-based). Set to pages.length for 100 %. */
  current_page?: number;
  author: { id: string; username: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const documentsApi = {
  list: (token: string) =>
    request<Document[]>("/documents", {}, token),

  mine: (token: string) =>
    request<Document[]>("/documents/me", {}, token),

  byAuthor: (email: string, token: string) =>
    request<Document[]>(`/documents/by-author/${encodeURIComponent(email)}`, {}, token),

  get: (id: string, token?: string) =>
    request<Document>(`/documents/${id}`, {}, token),

  create: (body: { title: string; content: string; pdf_url?: string | null; thumbnail_url?: string | null; pages?: StoredPage[] | null }, token: string) =>
    request<Document>("/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }, token),

  delete: (id: string, token: string) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: "DELETE" }, token),

  rename: (id: string, title: string, token: string) =>
    request<{ success: boolean; title: string }>(
      `/documents/${id}/rename`,
      { method: "PATCH", body: JSON.stringify({ title }) },
      token
    ),

  /**
   * Persist the user's reading position.  Fire-and-forget — the caller should
   * not await this and should swallow errors so a network hiccup never interrupts
   * playback.
   */
  saveProgress: (id: string, currentPage: number, token: string) =>
    request<{ success: boolean; current_page: number }>(
      `/documents/${id}/progress`,
      { method: "PATCH", body: JSON.stringify({ current_page: currentPage }) },
      token
    ),
};

// ── PDF

export const pdfApi = {
  upload: (file: File, token: string) => {
    const form = new FormData();
    form.append("pdf", file);
    return request<{ title: string; content: string; pdf_url: string | null; thumbnail_url: string | null; pages: StoredPage[]; message: string }>(
      "/pdf/upload",
      { method: "POST", body: form },
      token
    );
  },
};

// ── Voices 

export interface Voice {
  id: string;
  label: string;
}

export const voicesApi = {
  list: () =>
    request<{ voices: Voice[]; tts_available: boolean }>("/voices"),
};

// ── PDF proxy 

export function pdfProxyUrl(docId: string): string {
  return `${BASE}/pdf/${docId}`;
}

export function thumbnailProxyUrl(docId: string): string {
  return `${BASE}/pdf/${docId}/thumbnail`;
}

// ── Speak (POST → streaming SSE response)
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
