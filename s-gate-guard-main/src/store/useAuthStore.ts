import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { User } from '../types/auth';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    isAuthenticated: false,
    user: null,
    isLoading: true,

    login: async (token: string, user: User) => {
        try {
            // Save to secure storage
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

            console.log('💾 Saved to secure storage:', {
                token: token.substring(0, 20) + '...',
                user: { name: user.name, role: user.role }
            });

            // Update state
            set({
                token,
                user,
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
            // Clear secure storage
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);

            // Clear state
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
            // Still clear state even if secure storage fails
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },

    loadToken: async () => {
        try {
            set({ isLoading: true });

            const [token, userJson] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
            ]);

            if (token && userJson) {
                const user = JSON.parse(userJson) as User;
                set({
                    token,
                    user,
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
