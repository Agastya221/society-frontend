type FlatLike = { number?: string; flatNumber?: string } | null | undefined;

/**
 * The backend returns the flat as `{ flatNumber, block }`, but the screens read
 * `flat.number` (QR card, profile completion, booking and dues labels). Fill
 * `number` in once, where the user enters the app, instead of in every screen.
 */
export function normalizeUser<T extends { flat?: FlatLike } | null | undefined>(user: T): T {
    if (!user?.flat) return user;
    const number = user.flat.number ?? user.flat.flatNumber;
    if (!number || number === user.flat.number) return user;
    return { ...user, flat: { ...user.flat, number } };
}
