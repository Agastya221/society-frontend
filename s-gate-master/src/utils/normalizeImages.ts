/**
 * Image URL normalization utility
 * Converts relative image paths from backend to full URLs
 */

// Backend base URL - centralized constant
export const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

/**
 * Converts a relative image path to a full URL
 * @param relativePath - Relative image path from backend (e.g., "entry-photos/user-id/image.png")
 * @returns Full URL or empty string if invalid
 */
export function normalizeImageUrl(relativePath: string | null | undefined): string {
    if (!relativePath) return '';

    // If already a full URL, return as-is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }

    // Remove leading slash if present to avoid double slashes
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    return `${IMAGE_BASE_URL}/${cleanPath}`;
}

/**
 * Converts an array of relative image paths to full URLs
 * @param images - Array of relative image paths
 * @returns Array of full URLs, filtered to remove empty values
 */
export function normalizeImageUrls(images: string[] | null | undefined): string[] {
    if (!images || !Array.isArray(images)) {
        return [];
    }

    return images
        .map(img => normalizeImageUrl(img))
        .filter(url => url.length > 0);
}
