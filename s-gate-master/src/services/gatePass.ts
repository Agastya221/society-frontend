import axios from 'axios';
import api from './api';

export type GatePassType = 'MATERIAL' | 'VEHICLE' | 'MOVE_IN' | 'MOVE_OUT' | 'MAINTENANCE';
export type GatePassStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'USED' | 'EXPIRED';

export interface CreateGatePassPayload {
    type: GatePassType;
    title: string;
    description: string;
    validFrom: string; // ISO datetime
    validUntil: string;   // ISO datetime
    contractorName?: never; // specific exclusion to avoid confusion
    companyName?: string | null;
    workerName?: string | null;
    flatId?: string;   // Optional: For admin creating pass for specific flat
}

export type CreateGatePassDTO = CreateGatePassPayload;

export interface ScanGatePassDTO {
    qrCode: string;
}

export interface GatePass {
    id: string;
    type: GatePassType;
    status: GatePassStatus;
    title: string;
    description: string | null;
    validFrom: string;
    validUntil: string;
    companyName: string | null;
    workerName: string | null;
    flatId: string;
    societyId: string;
    createdAt: string;
    updatedAt: string;
    qrToken?: string;
    // Helper fields that might come from backend response
    code?: string;
    qrCodeUrl?: string;
    flat?: {
        flatNumber: string;
        block?: {
            name: string;
        };
    };
    requestedBy?: {
        name: string;
        phone: string;
    };
}

export interface GatePassResponse {
    id: string;
    code: string;
    status: string;
    qrCodeUrl: string;
}

/**
 * Create a new gate pass
 * @param payload - Gate pass details
 * @returns Created gate pass data
 */
export const createGatePass = async (payload: CreateGatePassPayload): Promise<GatePassResponse> => {
    try {
        console.log('📤 Creating Gate Pass:', payload);

        const response = await api.post<{ success: boolean; data: GatePassResponse }>(
            '/gate/passes',
            payload
        );

        if (response.data.success) {
            console.log('✅ Gate Pass created:', response.data.data);
            return response.data.data;
        }

        throw new Error('Failed to create gate pass');
    } catch (error: any) {
        handleApiError(error, 'create gate pass');
        throw error;
    }
};

/**
 * Get all gate passes
 * @param societyId - Optional society ID filter
 * @returns List of gate passes
 */
export const getAllGatePasses = async (societyId?: string): Promise<GatePass[]> => {
    try {
        const response = await api.get<{ success: boolean; data: GatePass[] }>('/gate/passes', {
            params: societyId ? { societyId } : {}
        });
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'fetch gate passes');
        throw error;
    }
};

/**
 * Get a single gate pass by ID
 * @param id - Gate pass ID
 * @returns Gate pass details
 */
export const getGatePassById = async (id: string): Promise<GatePass> => {
    try {
        const response = await api.get<{ success: boolean; data: GatePass }>(`/gate/passes/${id}`);
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'fetch gate pass');
        throw error;
    }
};

/**
 * Scan a gate pass QR code (Guard only)
 * @param payload - QR code data
 * @returns Validation result
 */
export const scanGatePass = async (payload: ScanGatePassDTO): Promise<any> => {
    try {
        const response = await api.post<{ success: boolean; data: any }>('/gate/passes/scan', payload);
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'scan gate pass');
        throw error;
    }
};

/**
 * Get gate pass QR code data
 * @param id - Gate pass ID
 * @returns QR code data
 */
export const getGatePassQr = async (id: string): Promise<any> => {
    try {
        const response = await api.get<{ success: boolean; data: any }>(`/gate/passes/${id}/qr`);
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'fetch gate pass QR');
        throw error;
    }
};

/**
 * Approve a pending gate pass (Admin only)
 * @param id - Gate pass ID
 * @returns Updated gate pass
 */
export const approveGatePass = async (id: string): Promise<GatePass> => {
    try {
        const response = await api.patch<{ success: boolean; data: GatePass }>(`/gate/passes/${id}/approve`);
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'approve gate pass');
        throw error;
    }
};

/**
 * Reject a pending gate pass (Admin only)
 * @param id - Gate pass ID
 * @param reason - Rejection reason
 * @returns Updated gate pass
 */
export const rejectGatePass = async (id: string, reason?: string): Promise<GatePass> => {
    try {
        const response = await api.patch<{ success: boolean; data: GatePass }>(`/gate/passes/${id}/reject`, { reason });
        return response.data.data;
    } catch (error: any) {
        handleApiError(error, 'reject gate pass');
        throw error;
    }
};

/**
 * Delete/Cancel a gate pass
 * @param id - Gate pass ID
 */
export const deleteGatePass = async (id: string): Promise<void> => {
    try {
        await api.delete<{ success: boolean }>(`/gate/passes/${id}`);
    } catch (error: any) {
        handleApiError(error, 'delete gate pass');
        throw error;
    }
};

// Helper to handle API errors consistently
const handleApiError = (error: any, action: string) => {
    console.error(`❌ Failed to ${action}:`, error);

    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || `Failed to ${action}`;

        if (status === 400) throw new Error(message || 'Invalid request data');
        if (status === 401) throw new Error('Session expired');
        if (status === 403) throw new Error(`You do not have permission to ${action}`);

        throw new Error(message);
    }
};
