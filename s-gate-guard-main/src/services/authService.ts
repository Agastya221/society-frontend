import { LoginRequest, LoginResponse } from '../types/auth';
import api from './api';

export const authService = {
    /**
     * Login guard with phone/email and password
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

            console.log('═══════════════════════════════════════════════');
            console.log('🔑 LOGIN REQUEST');
            console.log('═══════════════════════════════════════════════');
            console.log('📍 Endpoint:', '/api/v1/auth/admin-app/login');
            console.log('📧 Identifier:', credentials.identifier);
            console.log('🔐 Password:', credentials.password.replace(/./g, '*'));
            console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));
            console.log('═══════════════════════════════════════════════');

            const response = await api.post<LoginResponse>('/api/v1/auth/admin-app/login', requestBody);

            console.log('═══════════════════════════════════════════════');
            console.log('✅ LOGIN RESPONSE');
            console.log('═══════════════════════════════════════════════');
            console.log('📦 Full Response:', JSON.stringify(response.data, null, 2));
            console.log('🔑 Token:', response.data.data?.token ? response.data.data.token.substring(0, 30) + '...' : 'N/A');
            console.log('🔑 Access Token:', response.data.data?.accessToken ? response.data.data.accessToken.substring(0, 30) + '...' : 'N/A');
            console.log('👤 User:', JSON.stringify(response.data.data?.user, null, 2));
            console.log('🎭 Role:', response.data.data?.user?.role);
            console.log('✅ Success:', response.data.success);
            console.log('💬 Message:', response.data.message);
            console.log('═══════════════════════════════════════════════');

            return response.data;
        } catch (error: any) {
            console.log('═══════════════════════════════════════════════');
            console.log('❌ LOGIN ERROR');
            console.log('═══════════════════════════════════════════════');
            console.log('Error:', error);
            console.log('═══════════════════════════════════════════════');

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
};
