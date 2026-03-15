import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { User } from '../types/auth';

const TOKEN_KEY         = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY          = 'auth_user';
const APP_TYPE_KEY      = 'auth_app_type';

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: User | null;
    role: string | null;
    appType: string | null;
    requiresOnboarding: boolean;
    onboardingStatus: string | null;
    isLoading: boolean;
    login: (
        accessToken: string,
        refreshToken: string,
        user: User,
        appType?: string,
        requiresOnboarding?: boolean,
        onboardingStatus?: string | null,
    ) => Promise<void>;
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
    role: null,
    appType: null,
    requiresOnboarding: false,
    onboardingStatus: null,
    isLoading: true,

    login: async (
        accessToken: string,
        refreshToken: string,
        user: User,
        appType?: string,
        requiresOnboarding?: boolean,
        onboardingStatus?: string | null,
    ) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
            if (appType) await SecureStore.setItemAsync(APP_TYPE_KEY, appType);
            await SecureStore.setItemAsync('requiresOnboarding', String(requiresOnboarding ?? false));
            await SecureStore.setItemAsync('onboardingStatus', onboardingStatus ?? '');

            set({
                accessToken,
                refreshToken,
                user,
                role: user.role,
                appType: appType ?? null,
                requiresOnboarding: requiresOnboarding ?? false,
                onboardingStatus: onboardingStatus ?? null,
                isAuthenticated: true,
                isLoading: false,
            });
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
            // Using plain fetch to avoid axios interceptor loop
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
                throw new Error('Invalid token structure in response');
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
        
        // Attempt to notify backend
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
            await SecureStore.deleteItemAsync(APP_TYPE_KEY);
            await SecureStore.deleteItemAsync('requiresOnboarding');
            await SecureStore.deleteItemAsync('onboardingStatus');
        } catch {}

        set({
            accessToken: null,
            refreshToken: null,
            user: null,
            role: null,
            appType: null,
            requiresOnboarding: false,
            onboardingStatus: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    loadToken: async () => {
        try {
            set({ isLoading: true });
            const [accessToken, refreshToken, userJson, appType, requiresOnboarding, onboardingStatus] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
                SecureStore.getItemAsync(APP_TYPE_KEY),
                SecureStore.getItemAsync('requiresOnboarding'),
                SecureStore.getItemAsync('onboardingStatus'),
            ]);

            if (accessToken && userJson) {
                const user = JSON.parse(userJson) as User;
                set({
                    accessToken,
                    refreshToken: refreshToken ?? null,
                    user,
                    role: user.role,
                    appType: appType ?? null,
                    requiresOnboarding: requiresOnboarding === 'true',
                    onboardingStatus: onboardingStatus || null,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            set({ isLoading: false });
        }
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
