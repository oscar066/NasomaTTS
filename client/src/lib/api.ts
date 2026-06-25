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
    request<{ id: string; username: string; email: string; avatar: string; plan: string; is_superuser: boolean }>(
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

// ── Admin

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  avatar: string;
  plan: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  joined: string;
  doc_count: number;
}

export interface AdminStats {
  total_users: number;
  total_documents: number;
  new_users_this_week: number;
  new_docs_this_week: number;
  verified_users: number;
  unverified_users: number;
}

export const adminApi = {
  stats: (token: string) =>
    request<AdminStats>("/admin/stats", {}, token),

  users: (token: string, search = "", skip = 0, limit = 20) =>
    request<{ total: number; users: AdminUser[] }>(
      `/admin/users?search=${encodeURIComponent(search)}&skip=${skip}&limit=${limit}`,
      {},
      token
    ),

  toggleActive: (userId: string, token: string) =>
    request<{ id: string; is_active: boolean }>(
      `/admin/users/${userId}/toggle-active`,
      { method: "PATCH" },
      token
    ),

  createUser: (token: string, body: { email: string; username: string; is_superuser: boolean; plan: string }) =>
    request<{ id: string; email: string; username: string }>(
      "/admin/users",
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  resendVerification: (userId: string, token: string) =>
    request<{ sent: boolean }>(
      `/admin/users/${userId}/resend-verification`,
      { method: "POST" },
      token
    ),

  updatePlan: (userId: string, plan: string, token: string) =>
    request<{ id: string; plan: string }>(
      `/admin/users/${userId}/plan`,
      { method: "PATCH", body: JSON.stringify({ plan }) },
      token
    ),

  editUser: (token: string, userId: string, body: { plan: string; is_superuser: boolean }) =>
    request<{ id: string; plan: string; is_superuser: boolean }>(
      `/admin/users/${userId}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),
};

// ── Documents

export interface StoredParagraph {
  text: string;
  /**
   * Paragraph bounding box in PDF user-space coordinates [x0, y0, x1, y1]
   * (points at 72 DPI, origin top-left).  Tight bbox computed from constituent
   * words — accurate even for single-stream PDFs where block detection fails.
   */
  bbox?: [number, number, number, number];
  /**
   * Ordered list of words in this paragraph (parallel to word_bboxes).
   * Used by the SSE word-index to look up which word is being spoken.
   */
  word_texts?: string[];
  /**
   * Per-word bounding boxes [x0, y0, x1, y1] in PDF user-space coordinates,
   * in the same order as word_texts.  The frontend scales these by
   * (containerWidth / page.width) to position highlight overlays precisely.
   */
  word_bboxes?: [number, number, number, number][];
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
  /** Number of pages. Pages themselves are fetched via GET /documents/{id}/pages. */
  page_count?: number | null;
  /** Total words across all pages. Used for reading-time estimates and statistics. */
  total_word_count?: number | null;
  /** Last page the user reached (0-based). Set to page_count for 100 %. */
  current_page?: number;
  reading_status?: string | null;
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

  create: (body: { title: string; content: string; pdf_url?: string | null; thumbnail_url?: string | null; pages?: StoredPage[] | null; page_count?: number | null; total_word_count?: number | null }, token: string) =>
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

  setStatus: (id: string, status: string | null, token: string) =>
    request<{ success: boolean; reading_status: string | null }>(
      `/documents/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ reading_status: status }) },
      token
    ),
};

// ── PDF

export const pdfApi = {
  upload: (file: File, token: string) => {
    const form = new FormData();
    form.append("pdf", file);
    return request<{ title: string; content: string; pdf_url: string | null; thumbnail_url: string | null; pages: StoredPage[]; total_word_count: number; message: string }>(
      "/pdf/upload",
      { method: "POST", body: form },
      token
    );
  },

  /**
   * Fetch all pages for a document, including paragraph and word-level bbox data.
   * Served from the backend's Redis cache after the first load (TTL 24 h).
   * Returns an empty array for plain-text documents that have no page data.
   */
  getPages: (docId: string, token?: string) =>
    request<StoredPage[]>(`/documents/${docId}/pages`, {}, token),
};

// ── Voices 

export interface Voice {
  id: string;
  label: string;
  tier?: "premium" | "standard";
  icon?: string;
  group?: string;
}

export const voicesApi = {
  list: () =>
    request<{ voices: Voice[]; tts_available: boolean }>("/voices"),
};

// ── User preferences

export const preferencesApi = {
  save: (voice: string | null, speed: number | null, token: string) =>
    request<void>(
      "/users/me",
      { method: "PATCH", body: JSON.stringify({ pref_voice: voice, pref_speed: speed }) },
      token
    ),
  load: (token: string) =>
    request<{ pref_voice: string | null; pref_speed: number | null }>("/users/me", {}, token),
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

// ── Paragraph audio (GET → WAV bytes from Kokoro sidecar)

/**
 * Fetch synthesized WAV audio for a specific paragraph in a stored document.
 * Returns the raw fetch Response so the caller can check status before
 * creating a blob URL — avoids holding large audio buffers in memory.
 */
export function fetchParagraphAudio(
  docId: string,
  page: number,
  para: number,
  voice: string,
  token: string,
  signal?: AbortSignal
): Promise<Response> {
  const params = new URLSearchParams({
    page: String(page),
    para: String(para),
    voice,
  });
  return fetch(`${BASE}/tts/audio/${docId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
