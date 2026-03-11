import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { User } from '../types/auth';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const APP_TYPE_KEY = 'auth_app_type';

export interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    user: User | null;
    role: string | null;
    appType: string | null;
    isLoading: boolean;
    login: (token: string, user: User, appType?: string) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    isAuthenticated: false,
    user: null,
    role: null,
    appType: null,
    isLoading: true,

    login: async (token: string, user: User, appType?: string) => {
        try {
            // Save to secure storage
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
            if (appType) {
                await SecureStore.setItemAsync(APP_TYPE_KEY, appType);
            }

            // Update state
            set({
                token,
                user,
                role: user.role,
                appType: appType || null,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw new Error('Failed to save authentication data');
        }
    },

    logout: async () => {
        try {
            // Import here to avoid circular dep
            const { authService } = await import('../services/authService');
            const state = useAuthStore.getState();
            await authService.logout(state.token ?? undefined);
        } catch {
            // best-effort
        }
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            await SecureStore.deleteItemAsync(APP_TYPE_KEY);
        } catch {}
        set({ token: null, user: null, role: null, appType: null, isAuthenticated: false, isLoading: false });
    },

    loadToken: async () => {
        try {
            set({ isLoading: true });

            const [token, userJson, appType] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
                SecureStore.getItemAsync(APP_TYPE_KEY),
            ]);

            if (token && userJson) {
                const user = JSON.parse(userJson) as User;
                set({
                    token,
                    user,
                    role: user.role,
                    appType: appType || null,
                    isAuthenticated: true,
                    isLoading: false,
                });
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

