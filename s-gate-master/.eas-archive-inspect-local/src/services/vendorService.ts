/**
 * vendorService.ts
 *
 * Client for the /staff/vendors/* API group.
 * Covers: list, by-category, detail, create (admin), update (admin),
 * verify (admin), delete (admin), rate.
 */

import api from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VendorCategory =
    | 'PLUMBER'
    | 'ELECTRICIAN'
    | 'CARPENTER'
    | 'PAINTER'
    | 'CLEANER'
    | 'GARDENER'
    | 'PEST_CONTROL'
    | 'APPLIANCE_REPAIR'
    | 'OTHER';

export interface Vendor {
    id: string;
    name: string;
    phone: string;
    category: VendorCategory;
    email?: string;
    address?: string;
    isVerified: boolean;
    overallRating?: number;
    totalRatings?: number;
    societyId?: string;
    createdAt: string;
}

export interface CreateVendorPayload {
    name: string;
    phone: string;
    category: VendorCategory;
    email?: string;
    address?: string;
}

export interface GetVendorsParams {
    category?: VendorCategory;
    page?: number;
    limit?: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getVendors = async (params?: GetVendorsParams): Promise<Vendor[]> => {
    const res = await api.get('/staff/vendors', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.vendors ?? []);
};

export const getVendorsByCategory = async (): Promise<Record<VendorCategory, Vendor[]>> => {
    const res = await api.get<{ success: boolean; data: Record<VendorCategory, Vendor[]> }>(
        '/staff/vendors/by-category'
    );
    return res.data.data;
};

export const getVendorById = async (id: string): Promise<Vendor> => {
    const res = await api.get<{ success: boolean; data: Vendor }>(`/staff/vendors/${id}`);
    return res.data.data;
};

// ─── Admin Mutations ──────────────────────────────────────────────────────────

export const createVendor = async (data: CreateVendorPayload): Promise<Vendor> => {
    const res = await api.post<{ success: boolean; data: Vendor }>('/staff/vendors', data);
    return res.data.data;
};

export const updateVendor = async (
    id: string,
    data: Partial<CreateVendorPayload>
): Promise<Vendor> => {
    const res = await api.patch<{ success: boolean; data: Vendor }>(`/staff/vendors/${id}`, data);
    return res.data.data;
};

export const verifyVendor = async (id: string): Promise<Vendor> => {
    const res = await api.patch<{ success: boolean; data: Vendor }>(`/staff/vendors/${id}/verify`);
    return res.data.data;
};

export const deleteVendor = async (id: string): Promise<void> => {
    await api.delete(`/staff/vendors/${id}`);
};

// ─── Resident Action ──────────────────────────────────────────────────────────

export const rateVendor = async (id: string, rating: number): Promise<Vendor> => {
    const res = await api.post<{ success: boolean; data: Vendor }>(
        `/staff/vendors/${id}/rate`,
        { rating }
    );
    return res.data.data;
};
