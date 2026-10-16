import api from './api';

export interface GuardFlat {
  id: string;
  flatNumber: string;
  block?: { name: string } | null;
  residents?: { name: string }[];
}

let cache: { guardId: string; flats: GuardFlat[] } | null = null;
let pending: { guardId: string; promise: Promise<GuardFlat[]> } | null = null;

/** Prefetch once per guard session; unusual flats still have the keypad search. */
export function loadFlatDirectory(guardId: string): Promise<GuardFlat[]> {
  if (cache?.guardId === guardId) return Promise.resolve(cache.flats);
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
    cache = { guardId, flats };
    return flats;
  })();
  pending = { guardId, promise };
  void promise.then(
    () => { if (pending?.promise === promise) pending = null; },
    () => { if (pending?.promise === promise) pending = null; },
  );
  return promise;
}
