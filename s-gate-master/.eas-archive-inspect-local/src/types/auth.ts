export interface LoginRequest {
    identifier: string; // phone or email
    password: string;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: 'ADMIN' | 'RESIDENT' | 'GUARD' | 'SUPER_ADMIN' | string;
    societyId?: string | null;
    flatId?: string | null;
    photoUrl?: string | null;
    isActive?: boolean;
    flat?: {
        number: string;
        block?: { name: string };
    } | null;
    society?: {
        name: string;
        address?: string;
        city?: string;
    } | null;
    /** @deprecated use photoUrl */
    avatar?: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token?: string; // Legacy field
        accessToken?: string; // New field
        refreshToken?: string; // New field
        user: User;
        appType?: string;
    };
}

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    role: string | null;
    appType: string | null;
    requiresOnboarding: boolean;
    onboardingStatus: string | null;
    isAuthenticated: boolean;
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
