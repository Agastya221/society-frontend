import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { BASE_URL } from '../constants/api';
import { geoHeaders } from './location';

// Re-exported so other call sites (useAuthStore's refresh/logout, which use plain
// fetch to dodge the axios interceptor) never hard-code a second copy of this URL.
export { BASE_URL };

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
});

// ── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(
    async (config) => {
        const accessToken = useAuthStore.getState().accessToken;
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        // The server only accepts gate actions from a phone at the gate: every action (and the status check)
        // carries where this phone is. Reads and the login calls do not need it.
        const method = (config.method ?? 'get').toLowerCase();
        const url = config.url ?? '';
        const isAction = method !== 'get' && !url.includes('/auth/') && !url.includes('/upload/') && !url.includes('device');
        if (isAction || url.includes('/geofence/status')) {
            Object.entries(await geoHeaders()).forEach(([key, value]) => config.headers.set(key, value));
        }
        console.log('🚀 API Request:', config.method?.toUpperCase(), `${BASE_URL}${config.url}`);
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response: silent token refresh on 401 ────────────────────────────────────
let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const drainQueue = (token: string | null, error?: any) => {
    pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
    pendingQueue = [];
};

api.interceptors.response.use(
    (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, queue this request until we get a new token
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    pendingQueue.push({
                        resolve: (token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const { refreshToken, refreshAccessToken, logout } = useAuthStore.getState();

            if (!refreshToken) {
                isRefreshing = false;
                await logout();
                return Promise.reject(error);
            }

            try {
                // Call refresh endpoint stored in zustand. refreshAccessToken() itself
                // decides whether this failure logs the guard out (only on a 401/403
                // from the refresh call) — a network error/timeout/5xx here must not
                // sign the guard out just because the connection hiccupped.
                const newAccessToken = await refreshAccessToken();
                drainQueue(newAccessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                drainQueue(null, refreshError);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        const status = error.response?.status;
        const details = ['API request failed:', status, error.config?.url, error.response?.data?.message];
        if (status && status >= 500) console.error(...details);
        else console.warn(...details);
        return Promise.reject(error);
    }
);

export default api;
