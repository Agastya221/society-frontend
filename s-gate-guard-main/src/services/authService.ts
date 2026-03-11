import api from './api';

export const authService = {
    /**
     * Verify MSG91 widget token with the Guard app backend.
     * Called after OTPWidget.verifyOTP() succeeds on the client.
     */
    verifyGuardOtp: async (widgetToken: string) => {
        const response = await api.post('/api/v1/auth/guard-app/otp/verify', { widgetToken });
        return response.data;
    },

    /**
     * Logout guard — calls backend to blacklist tokens.
     */
    logout: async (): Promise<void> => {
        try {
            await api.post('/api/v1/auth/logout', {});
        } catch {
            // Best-effort — local state will still be cleared
        }
    },
};
