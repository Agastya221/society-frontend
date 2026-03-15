import api from './api';

export const authService = {
    /**
     * Verify MSG91 widget token with the Admin/Resident app backend.
     * Called after OTPWidget.verifyOTP() succeeds on the client.
     */
    verifyAdminOtp: async (widgetToken: string) => {
        const response = await api.post('/api/v1/auth/otp/verify', { widgetToken });
        return response.data;
    },

    /**
     * Verify MSG91 widget token with the Guard app backend.
     * Called after OTPWidget.verifyOTP() succeeds on the client.
     */
    verifyGuardOtp: async (widgetToken: string) => {
        const response = await api.post('/api/v1/auth/guard-app/otp/verify', { widgetToken });
        return response.data;
    },

    /**
     * Logout user — calls backend to blacklist tokens.
     */
    logout: async (accessToken?: string, refreshToken?: string): Promise<void> => {
        try {
            if (accessToken) {
                await api.post('/api/v1/auth/logout', { refreshToken });
            }
        } catch {
            // Best-effort — local state will still be cleared
        }
    },
};
