import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { router } from 'expo-router';

const BASE_URL = 'https://society-gate-backend-gsrq.onrender.com/api/v1';

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
});

// ── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const accessToken = useAuthStore.getState().accessToken;
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        console.log('🚀 API Request:', config.method?.toUpperCase(), `${BASE_URL}${config.url}`);
        if (config.data) {
            console.log('📦 Request Body:', JSON.stringify(config.data, null, 2));
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response: silent token refresh on 401 ────────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

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

        // Skip token refresh for endpoints that may legitimately 401 during onboarding
        const requestUrl: string = originalRequest.url ?? '';
        const shouldSkip =
            requestUrl.includes('/resident/onboarding') ||
            requestUrl.includes('/society-registration');

        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkip) {
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
                router.replace('/login');
                return Promise.reject(error);
            }

            try {
                // Call refresh endpoint stored in zustand
                const newAccessToken = await refreshAccessToken();
                drainQueue(newAccessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                drainQueue(null, refreshError);
                await logout();
                router.replace('/login');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        console.error('❌ API Error:', error.response?.status, error.config?.url, error.response?.data?.message);
        console.error('❌ Full Error Body:', JSON.stringify(error.response?.data, null, 2));
        return Promise.reject(error);
    }
);

export default api;
