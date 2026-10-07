/**
 * True when the server has no such route yet (Express's default HTML 404),
 * as opposed to a JSON 404 from a handler ("Resident not found").
 * Lets screens show a "needs server update" state instead of an error.
 */
export function isRouteMissing(err: any): boolean {
    if (err?.response?.status !== 404) return false;
    const data = err.response.data;
    return !data || typeof data !== 'object' || data.success === undefined;
}

/** Server message for an axios error, or the fallback. */
export function serverMessage(err: any, fallback: string): string {
    const msg = err?.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}
