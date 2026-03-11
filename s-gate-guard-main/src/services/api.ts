import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

const api = axios.create({
    baseURL: 'https://society-gate-backend-gsrq.onrender.com',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to inject token and log requests
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Log outgoing request
            console.log('🔵 API Request:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                baseURL: config.baseURL,
                fullURL: `${config.baseURL}${config.url}`,
                headers: config.headers,
                data: config.data,
            });
        } catch (error) {
            console.error('❌ Failed to get token:', error);
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
    (response) => {
        // Log successful response
        console.log('✅ API Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.config.url,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        // Log error response
        if (error.response) {
            console.error('❌ API Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                url: error.config?.url,
                data: error.response.data,
                headers: error.response.headers,
            });
        } else if (error.request) {
            console.error('❌ Network Error - No Response:', {
                url: error.config?.url,
                message: error.message,
            });
        } else {
            console.error('❌ Error:', error.message);
        }

        if (error.response?.status === 401) {
            // Token expired or invalid - clear it
            console.warn('⚠️ 401 Unauthorized - Clearing token');
            try {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
            } catch (e) {
                console.error('Failed to clear token:', e);
            }
        }
        return Promise.reject(error);
    }
);

export default api;


