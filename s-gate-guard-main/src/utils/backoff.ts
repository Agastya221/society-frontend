/** Poll back-off after failed calls (network error, 429, 5xx): 3 s → 6 s → 12 s max. */
export const BACKOFF_START_MS = 3000;
export const BACKOFF_MAX_MS = 12000;

/**
 * Delay before the next poll after `failures` failed calls in a row.
 * 0 or 1 → 3 s, 2 → 6 s, 3+ → 12 s. Reset the count to 0 after a success.
 */
export function backoffDelay(failures: number): number {
  if (failures <= 1) return BACKOFF_START_MS;
  return Math.min(BACKOFF_START_MS * 2 ** (failures - 1), BACKOFF_MAX_MS);
}
