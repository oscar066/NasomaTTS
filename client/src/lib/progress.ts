/**
 * Reading-progress localStorage helpers.
 *
 * Each document's progress is stored under a dedicated key so it is updated
 * independently of the document-content cache.  This means progress is always
 * current on the same device, and the backend is used as the cross-device
 * fallback.
 *
 * Key format: `nasoma_progress_<documentId>`
 * Value: the 0-based page index (integer stored as a string).
 */

const key = (docId: string) => `nasoma_progress_${docId}`;

/**
 * Write the current page to localStorage.  Safe to call fire-and-forget —
 * never throws.
 */
export const saveLocalProgress = (docId: string, page: number): void => {
  try {
    localStorage.setItem(key(docId), String(page));
  } catch { /* storage full or unavailable — silently ignore */ }
};

/**
 * Read the saved page from localStorage.
 * Returns 0 when no progress has been saved yet or the value is invalid.
 */
export const loadLocalProgress = (docId: string): number => {
  try {
    const raw = localStorage.getItem(key(docId));
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
};

/**
 * Remove all saved progress for a document (e.g. when it is deleted).
 */
export const clearLocalProgress = (docId: string): void => {
  try {
    localStorage.removeItem(key(docId));
  } catch { /* ignore */ }
};
