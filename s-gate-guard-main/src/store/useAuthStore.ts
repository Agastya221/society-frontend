import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { User } from '../types/auth';

const TOKEN_KEY         = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY          = 'auth_user';

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    refreshAccessToken: () => Promise<string>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    user: null,
    isLoading: true,

    login: async (accessToken: string, refreshToken: string, user: User) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

            set({ accessToken, refreshToken, user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw new Error('Failed to save authentication data');
        }
    },

    refreshAccessToken: async () => {
        const { refreshToken, logout } = get();
        if (!refreshToken) {
            await logout();
            throw new Error('No refresh token available');
        }

        try {
            // Use basic fetch to avoid axios interceptor infinite loops
            const response = await fetch('https://society-gate-backend-gsrq.onrender.com/api/v1/auth/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Failed to refresh token');
            }

            const newAccessToken = data.data.accessToken;
            const newRefreshToken = data.data.refreshToken;

            if (!newAccessToken || !newRefreshToken) {
                throw new Error('Invalid tokens returned on refresh');
            }

            // Save new tokens
            await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

            set({ accessToken: newAccessToken, refreshToken: newRefreshToken });

            return newAccessToken;
        } catch (error) {
            await logout();
            throw error;
        }
    },

    logout: async () => {
        const { accessToken, refreshToken } = get();

        // Inform backend
        if (accessToken && refreshToken) {
            try {
                await fetch('https://society-gate-backend-gsrq.onrender.com/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ refreshToken }),
                });
            } catch (err) {
                console.error('Backend logout failed:', err);
            }
        }

        // Clear local storage
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
        } catch {}

        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, isLoading: false });
    },

    loadToken: async () => {
        try {
            set({ isLoading: true });
            const [accessToken, refreshToken, userJson] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
            ]);

            if (accessToken && userJson) {
                const user = JSON.parse(userJson) as User;
                set({ accessToken, refreshToken: refreshToken ?? null, user, isAuthenticated: true, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load auth data:', error);
            set({ isLoading: false });
        }
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
