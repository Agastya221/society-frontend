import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { User } from '../types/auth';

const TOKEN_KEY         = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY          = 'auth_user';
const APP_TYPE_KEY      = 'auth_app_type';

export interface AuthState {
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: User | null;
    role: string | null;
    appType: string | null;
    isLoading: boolean;
    login: (token: string, user: User, appType?: string, refreshToken?: string) => Promise<void>;
    setToken: (token: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    user: null,
    role: null,
    appType: null,
    isLoading: true,

    login: async (token: string, user: User, appType?: string, refreshToken?: string) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
            if (appType) await SecureStore.setItemAsync(APP_TYPE_KEY, appType);
            if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
            set({
                token,
                refreshToken: refreshToken ?? null,
                user,
                role: user.role,
                appType: appType ?? null,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw new Error('Failed to save authentication data');
        }
    },

    // Called by the API interceptor when it silently refreshes the access token
    setToken: async (token: string, refreshToken?: string) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        } catch {}
        set((state) => ({
            token,
            refreshToken: refreshToken ?? state.refreshToken,
        }));
    },

    logout: async () => {
        try {
            const { authService } = await import('../services/authService');
            const state = useAuthStore.getState();
            await authService.logout(state.token ?? undefined);
        } catch {}
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            await SecureStore.deleteItemAsync(APP_TYPE_KEY);
        } catch {}
        set({ token: null, refreshToken: null, user: null, role: null, appType: null, isAuthenticated: false, isLoading: false });
    },

    loadToken: async () => {
        try {
            set({ isLoading: true });
            const [token, refreshToken, userJson, appType] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
                SecureStore.getItemAsync(APP_TYPE_KEY),
            ]);
            if (token && userJson) {
                const user = JSON.parse(userJson) as User;
                set({ token, refreshToken: refreshToken ?? null, user, role: user.role, appType: appType ?? null, isAuthenticated: true, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
