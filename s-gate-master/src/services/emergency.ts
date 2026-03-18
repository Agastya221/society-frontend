import axios from 'axios';
import api from './api';

export type EmergencyType =
    | 'MEDICAL'
    | 'FIRE'
    | 'SECURITY'
    | 'LIFT_STUCK'
    | 'ANIMAL_THREAT'
    | 'OTHER';

export type EmergencyStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM' | 'ACTIVE';

export interface CreateEmergencyPayload {
    type: EmergencyType;
    description: string;
    location?: string;
}

export interface EmergencyResponse {
    id: string;
    type: EmergencyType;
    status: EmergencyStatus;
    description: string;
    location?: string;
    sender: {
        name: string;
        flat?: string;
        phone: string;
    };
    respondedBy?: {
        name: string;
        role: string;
    };
    responseNote?: string;
    resolutionNote?: string;
    resolvedAt?: string;
    createdAt: string;
}

/**
 * Raise a new emergency alert
 * Endpoint: POST /community/emergencies
 */
export const createEmergency = async (payload: CreateEmergencyPayload): Promise<EmergencyResponse> => {
    try {
        console.log('🚨 Raising Emergency:', payload);
        const response = await api.post<{ success: boolean; data: EmergencyResponse }>(
            '/community/emergencies',
            payload
        );
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'raise emergency');
        throw error;
    }
};

/**
 * Get all emergencies raised by the current user
 * Endpoint: GET /community/emergencies/my
 */
export const getMyEmergencies = async (): Promise<EmergencyResponse[]> => {
    try {
        const response = await api.get<{ success: boolean; data: { emergencies: EmergencyResponse[] } }>(
            '/community/emergencies/my'
        );
        return response.data.data.emergencies;
    } catch (error: any) {
        handleApiError(error, 'fetch my emergencies');
        throw error;
    }
};

/**
 * Get details of a specific emergency
 * Endpoint: GET /community/emergencies/:id
 */
export const getEmergencyById = async (id: string): Promise<EmergencyResponse> => {
    try {
        const response = await api.get<{ success: boolean; data: EmergencyResponse }>(
            `/community/emergencies/${id}`
        );
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'fetch emergency details');
        throw error;
    }
};

const handleApiError = (error: any, action: string) => {
    console.error(`❌ Failed to ${action}:`, error);
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || `Failed to ${action}`;
        throw new Error(message);
    }
};
