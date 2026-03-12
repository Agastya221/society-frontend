import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// ── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
        console.log('🚀 Guard API Request:', config.method?.toUpperCase(), `${BASE_URL}${config.url}`);
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
        console.log('✅ Guard API Response:', response.status, response.config.url);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
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

            const { refreshToken, setToken, logout } = useAuthStore.getState();

            if (!refreshToken) {
                isRefreshing = false;
                await logout();
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh-token`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = res.data?.data ?? {};

                if (!accessToken) throw new Error('No access token in refresh response');

                await setToken(accessToken, newRefreshToken);
                drainQueue(accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                drainQueue(null, refreshError);
                await logout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        console.error('❌ Guard API Error:', error.response?.status, error.config?.url, error.response?.data?.message);
        return Promise.reject(error);
    }
);

export default api;
