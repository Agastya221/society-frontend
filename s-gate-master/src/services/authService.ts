import { LoginRequest, LoginResponse } from '../types/auth';
import api from './api';

export const authService = {
    /**
     * Login user with phone/email and password
     */
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        try {
            // Determine if identifier is email or phone
            const isEmail = credentials.identifier.includes('@');

            // Build request body with the field names the backend expects
            const requestBody = {
                ...(isEmail ? { email: credentials.identifier } : { phone: credentials.identifier }),
                password: credentials.password,
            };

            console.log('🔑 Login attempt with identifier:', credentials.identifier);
            console.log('📤 Sending to API:', JSON.stringify(requestBody, null, 2));

            const response = await api.post<LoginResponse>('/api/v1/auth/admin-app/login', requestBody);

            console.log('✅ Login successful!');
            console.log('📦 Full response.data:', JSON.stringify(response.data, null, 2));
            console.log('🔑 Token type:', response.data.data?.token ? 'token' : response.data.data?.accessToken ? 'accessToken' : 'UNKNOWN');
            console.log('👤 User role:', response.data.data?.user?.role);

            return response.data;
        } catch (error: any) {
            // Transform error into user-friendly message
            if (error.response) {
                throw new Error(
                    error.response.data?.message ||
                    'Invalid credentials. Please try again.'
                );
            } else if (error.request) {
                throw new Error('Network error. Please check your connection.');
            } else {
                throw new Error('An unexpected error occurred.');
            }
        }
    },

    /**
     * Logout user - can be extended with backend call if needed
     */
    logout: async (): Promise<void> => {
        // If backend has a logout endpoint, call it here
        // await api.post('/auth/logout');
        return Promise.resolve();
    },
};
