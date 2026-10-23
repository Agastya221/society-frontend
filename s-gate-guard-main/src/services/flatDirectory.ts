import api from './api';

export interface GuardFlat {
  id: string;
  flatNumber: string;
  block?: { name: string } | null;
  residents?: { name: string }[];
}

/** Flats/residents change rarely, but a new move-in should show up within a shift. */
export const FLAT_DIRECTORY_TTL_MS = 10 * 60_000;

let cache: { guardId: string; flats: GuardFlat[]; at: number } | null = null;
let pending: { guardId: string; promise: Promise<GuardFlat[]> } | null = null;

/**
 * Flat list for the gate, cached per guard for 10 minutes. Pass `force: true` to
 * skip the cache (e.g. pull-to-refresh). Unusual flats still have the search box.
 */
export function loadFlatDirectory(guardId: string, options: { force?: boolean } = {}): Promise<GuardFlat[]> {
  const fresh = cache?.guardId === guardId && Date.now() - cache.at < FLAT_DIRECTORY_TTL_MS;
  if (fresh && !options.force) return Promise.resolve(cache!.flats);
  if (pending?.guardId === guardId) return pending.promise;

  const promise = (async () => {
    const flats: GuardFlat[] = [];
    let page = 1;
    let pages = 1;
    while (page <= pages) {
      const response = await api.get(`/api/v1/gate/flats?page=${page}&limit=100`);
      const data = response.data?.data;
      flats.push(...(data?.flats ?? []));
      pages = Math.min(data?.pagination?.pages ?? 1, 20);
      page++;
    }
    cache = { guardId, flats, at: Date.now() };
    return flats;
  })();
  pending = { guardId, promise };
  void promise.then(
    () => { if (pending?.promise === promise) pending = null; },
    () => { if (pending?.promise === promise) pending = null; },
  );
  return promise;
}

/** Drop the cached list (sign-out, or before a forced reload). */
export function clearFlatDirectory(): void {
  cache = null;
}
