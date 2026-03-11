export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'GUARD' | 'SUPER_ADMIN';
    guardId: string;
    gate: string;
    shift: 'MORNING' | 'EVENING' | 'NIGHT';
    photo?: string;
}

export interface LoginRequest {
    identifier: string; // phone or email
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token?: string; // Legacy field
        accessToken?: string; // New field
        refreshToken?: string;
        user: User;
        appType?: string;
    };
}
