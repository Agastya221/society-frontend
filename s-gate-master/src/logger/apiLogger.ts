/**
 * apiLogger.ts
 *
 * Centralized, structured API logging utility.
 * Integrates with the Axios interceptors in api.ts for zero-duplication logging.
 *
 * Features:
 *  - Structured JSON log objects for every request/response/error
 *  - Pretty console.group formatting in __DEV__
 *  - Silent in production (or minimal error-only logging)
 *  - Filtering by endpoint, method, or error-only mode
 *  - Duration tracking (request → response latency)
 */

// ─── Configuration ───────────────────────────────────────────────────────────

interface ApiLoggerConfig {
    /** Master switch — disables ALL logging when false */
    enabled: boolean;
    /** Only log errors (status >= 400 or network failures) */
    errorsOnly: boolean;
    /** Only log these endpoints (substring match). Empty = log everything */
    filterEndpoints: string[];
    /** Only log these HTTP methods. Empty = log everything */
    filterMethods: string[];
    /** Log full response body (can be noisy for large payloads) */
    logResponseBody: boolean;
    /** Log full request body */
    logRequestBody: boolean;
    /** Truncate body preview to this many characters (0 = no truncation) */
    bodyPreviewLength: number;
}

const config: ApiLoggerConfig = {
    enabled: __DEV__,            // ON in dev, OFF in production
    errorsOnly: false,           // Set true to suppress success logs
    filterEndpoints: [],         // e.g. ['/community/notices'] to only log notices
    filterMethods: [],           // e.g. ['POST', 'PATCH'] to only log mutations
    logResponseBody: true,
    logRequestBody: true,
    bodyPreviewLength: 600,      // chars — keeps logs readable
};

// ─── Runtime Config API ──────────────────────────────────────────────────────

export function configureApiLogger(overrides: Partial<ApiLoggerConfig>): void {
    Object.assign(config, overrides);
}

export function enableApiLogs(): void {
    config.enabled = true;
}

export function disableApiLogs(): void {
    config.enabled = false;
}

export function setErrorsOnly(value: boolean): void {
    config.errorsOnly = value;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shouldLog(method: string, url: string, isError: boolean): boolean {
    if (!config.enabled) return false;
    if (config.errorsOnly && !isError) return false;

    if (config.filterMethods.length > 0) {
        if (!config.filterMethods.includes(method.toUpperCase())) return false;
    }

    if (config.filterEndpoints.length > 0) {
        if (!config.filterEndpoints.some((ep) => url.includes(ep))) return false;
    }

    return true;
}

function truncate(value: any): string {
    try {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        if (!str) return '(empty)';
        if (config.bodyPreviewLength > 0 && str.length > config.bodyPreviewLength) {
            return str.substring(0, config.bodyPreviewLength) + `… (${str.length} chars)`;
        }
        return str;
    } catch {
        return '(unserializable)';
    }
}

function getPath(url: string | undefined): string {
    if (!url) return '(unknown)';
    // Strip base URL prefix if present
    const match = url.match(/\/api\/v1(\/.*)/);
    return match ? match[1] : url;
}

// ─── Duration Tracking ──────────────────────────────────────────────────────

const requestTimestamps = new Map<string, number>();

function getRequestKey(method: string, url: string): string {
    return `${method.toUpperCase()} ${url}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Log outgoing request (called from request interceptor).
 */
export function logApiRequest(
    method: string,
    url: string,
    body?: any
): void {
    const key = getRequestKey(method, url);
    requestTimestamps.set(key, Date.now());

    if (!shouldLog(method, url, false)) return;

    const path = getPath(url);
    const timestamp = new Date().toISOString();

    if (__DEV__) {
        console.group(`🚀 ${method.toUpperCase()} ${path}`);
        console.log('⏱️  Time:', timestamp);
        if (config.logRequestBody && body) {
            console.log('📦 Body:', truncate(body));
        }
        console.groupEnd();
    }
}

/**
 * Log successful response (called from response interceptor).
 */
export function logApiResponse(
    method: string,
    url: string,
    status: number,
    data?: any
): void {
    const path = getPath(url);
    const isError = status >= 400;

    if (!shouldLog(method, path, isError)) return;

    const key = getRequestKey(method, url);
    const startTime = requestTimestamps.get(key);
    const duration = startTime ? `${Date.now() - startTime}ms` : '—';
    requestTimestamps.delete(key);

    const timestamp = new Date().toISOString();

    const logObj = {
        type: 'API_RESPONSE' as const,
        method: method.toUpperCase(),
        url: path,
        status,
        success: status < 400,
        duration,
        timestamp,
        ...(config.logResponseBody && data ? { data: truncate(data) } : {}),
    };

    if (__DEV__) {
        const icon = status < 300 ? '✅' : status < 400 ? '↪️' : '⚠️';
        console.group(`${icon} ${status} ${method.toUpperCase()} ${path}  (${duration})`);
        if (config.logResponseBody && data) {
            console.log('📄 Response:', truncate(data));
        }
        console.groupEnd();
    } else {
        // Production: minimal structured log
        console.log(JSON.stringify(logObj));
    }
}

/**
 * Log error response (called from error interceptor).
 */
export function logApiError(
    method: string,
    url: string,
    status: number | undefined,
    errorData?: any,
    message?: string
): void {
    const path = getPath(url);

    if (!shouldLog(method, path, true)) return;

    const key = getRequestKey(method, url);
    const startTime = requestTimestamps.get(key);
    const duration = startTime ? `${Date.now() - startTime}ms` : '—';
    requestTimestamps.delete(key);

    const timestamp = new Date().toISOString();

    const logObj = {
        type: 'API_ERROR' as const,
        method: method.toUpperCase(),
        url: path,
        status: status ?? 0,
        success: false,
        duration,
        error: message ?? errorData?.message ?? 'Unknown error',
        timestamp,
    };

    if (__DEV__) {
        const statusLabel = status ?? 'NETWORK_ERROR';
        console.group(`❌ ${statusLabel} ${method.toUpperCase()} ${path}  (${duration})`);
        if (message) console.log('💬 Message:', message);
        if (errorData) console.log('🔴 Error Body:', truncate(errorData));
        console.groupEnd();
    } else {
        // Production: always log errors
        console.error(JSON.stringify(logObj));
    }
}
