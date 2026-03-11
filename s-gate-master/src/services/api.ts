import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
    baseURL: 'https://society-gate-backend-gsrq.onrender.com',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    async (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Console log API request details
        console.log('🚀 API Request:', {
            url: `${config.baseURL}${config.url}`,
            method: config.method?.toUpperCase(),
            headers: config.headers,
            data: config.data,
        });

        return config;
    },
    (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => {
        // Console log API response
        console.log('✅ API Response:', {
            url: response.config.url,
            status: response.status,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        // Console log API error
        console.error('❌ API Error:', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data,
        });

        if (error.response?.status === 401) {
            // Token expired or invalid - logout user
            console.log('🔒 401 Unauthorized - Logging out user');
            const logout = useAuthStore.getState().logout;
            await logout();
        }
        return Promise.reject(error);
    }
);

export default api;
