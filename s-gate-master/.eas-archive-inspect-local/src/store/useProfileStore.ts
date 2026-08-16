import { create } from 'zustand';
import api from '../services/api';
import * as profileService from '../services/profile.service';
import type { User, FamilyMember } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffSummary {
    id: string;
    name: string;
    staffType: string;
}

export interface VehicleSummary {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    status: string;
}

export interface ProfileStoreState {
    // Data
    profile: User | null;
    familyMembers: FamilyMember[];
    staffList: StaffSummary[];
    vehicles: VehicleSummary[];

    // Meta
    lastFetched: number | null;
    loading: boolean;
    errors: {
        profile: string | null;
        family: string | null;
        staff: string | null;
        vehicles: string | null;
    };

    // Actions
    fetchAll: (force?: boolean) => Promise<void>;
    fetchSection: (section: 'profile' | 'family' | 'staff' | 'vehicles') => Promise<void>;
    invalidate: () => void;
    reset: () => void;
}

const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
    // Initial state
    profile: null,
    familyMembers: [],
    staffList: [],
    vehicles: [],
    lastFetched: null,
    loading: false,
    errors: { profile: null, family: null, staff: null, vehicles: null },

    fetchAll: async (force = false) => {
        const { lastFetched, loading } = get();
        if (loading) return;

        // Skip if data is fresh (unless forced)
        if (!force && lastFetched && Date.now() - lastFetched < STALE_AFTER_MS) return;

        set({ loading: true });

        const [profileRes, familyRes, staffRes, vehicleRes] = await Promise.allSettled([
            profileService.getProfile(),
            profileService.getFamilyMembers(),
            api.get('/staff/domestic').then(r => {
                const d = r.data?.data;
                return Array.isArray(d) ? d : (d?.staff ?? []);
            }),
            api.get('/resident/vehicles/my').then(r => {
                const d = r.data?.data ?? r.data;
                return Array.isArray(d) ? d : (d?.vehicles ?? []);
            }),
        ]);

        const errors = { ...get().errors };

        if (profileRes.status === 'fulfilled') {
            set({ profile: profileRes.value });
            errors.profile = null;
        } else {
            errors.profile = 'Failed to load profile';
        }

        if (familyRes.status === 'fulfilled') {
            set({ familyMembers: familyRes.value });
            errors.family = null;
        } else {
            errors.family = 'Failed to load family';
        }

        if (staffRes.status === 'fulfilled') {
            set({
                staffList: (staffRes.value as any[]).map(s => ({
                    id: s.id,
                    name: s.name ?? 'Staff',
                    staffType: s.staffType ?? 'OTHER',
                })),
            });
            errors.staff = null;
        } else {
            errors.staff = 'Failed to load staff';
        }

        if (vehicleRes.status === 'fulfilled') {
            set({
                vehicles: (vehicleRes.value as any[]).map(v => ({
                    id: v.id,
                    vehicleNumber: v.vehicleNumber ?? v.number ?? '',
                    vehicleType: v.vehicleType ?? v.type ?? 'Other',
                    status: v.status ?? 'PENDING',
                })),
            });
            errors.vehicles = null;
        } else {
            errors.vehicles = 'Failed to load vehicles';
        }

        set({ errors, lastFetched: Date.now(), loading: false });
    },

    fetchSection: async (section) => {
        const errors = { ...get().errors };
        try {
            switch (section) {
                case 'profile': {
                    const p = await profileService.getProfile();
                    set({ profile: p });
                    errors.profile = null;
                    break;
                }
                case 'family': {
                    const f = await profileService.getFamilyMembers();
                    set({ familyMembers: f });
                    errors.family = null;
                    break;
                }
                case 'staff': {
                    const r = await api.get('/staff/domestic');
                    const d = r.data?.data;
                    const list = Array.isArray(d) ? d : (d?.staff ?? []);
                    set({
                        staffList: list.map((s: any) => ({
                            id: s.id,
                            name: s.name ?? 'Staff',
                            staffType: s.staffType ?? 'OTHER',
                        })),
                    });
                    errors.staff = null;
                    break;
                }
                case 'vehicles': {
                    const r = await api.get('/resident/vehicles/my');
                    const d = r.data?.data ?? r.data;
                    const list = Array.isArray(d) ? d : (d?.vehicles ?? []);
                    set({
                        vehicles: list.map((v: any) => ({
                            id: v.id,
                            vehicleNumber: v.vehicleNumber ?? v.number ?? '',
                            vehicleType: v.vehicleType ?? v.type ?? 'Other',
                            status: v.status ?? 'PENDING',
                        })),
                    });
                    errors.vehicles = null;
                    break;
                }
            }
        } catch {
            (errors as any)[section] = `Failed to load ${section}`;
        }
        set({ errors });
    },

    invalidate: () => set({ lastFetched: null }),

    reset: () =>
        set({
            profile: null,
            familyMembers: [],
            staffList: [],
            vehicles: [],
            lastFetched: null,
            loading: false,
            errors: { profile: null, family: null, staff: null, vehicles: null },
        }),
}));
