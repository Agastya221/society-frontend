export interface LoginRequest {
    identifier: string; // phone or email
    password: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'ADMIN' | 'RESIDENT' | 'GUARD' | string;
    society?: string;
    flat?: string;
    societyId?: string;
    flatId?: string;
    avatar?: string;
    isActive?: boolean;
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
    user: User | null;
    role: string | null;
    appType: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string, user: User, appType?: string) => Promise<void>;
    refreshAccessToken: () => Promise<string>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}
