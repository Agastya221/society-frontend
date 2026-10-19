import { useEffect, useState } from 'react';
import { getEntryRequestPhoto } from '@/services/gate.service';

/** Signed photo links per request, so a card shown twice (Home, popup) asks the server once. */
const cache = new Map<string, string | null>();

/**
 * The photo the guard took of the visitor at the gate, for a gate request.
 * Returns null while loading or when there is no photo. Pass `mayHavePhoto` false to skip the call.
 */
export function useVisitorPhoto(requestId?: string, mayHavePhoto = true): string | null {
  const [url, setUrl] = useState<string | null>(requestId ? cache.get(requestId) ?? null : null);

  useEffect(() => {
    if (!requestId || !mayHavePhoto) { setUrl(null); return; }
    if (cache.has(requestId)) { setUrl(cache.get(requestId) ?? null); return; }
    let cancelled = false;
    getEntryRequestPhoto(requestId)
      .then((r) => {
        const link = r.viewUrl || null;
        cache.set(requestId, link);
        if (!cancelled) setUrl(link);
      })
      .catch(() => {
        // No photo for this request (or no network): show the person icon instead
        cache.set(requestId, null);
        if (!cancelled) setUrl(null);
      });
    return () => { cancelled = true; };
  }, [requestId, mayHavePhoto]);

  return url;
}
