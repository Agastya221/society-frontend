import { create } from 'zustand';
import type { Entry, EntryRequest, InvitePass } from '../types/api';
import * as gateService from '../services/gate.service';

interface GateState {
    // ── State ──────────────────────────────────────────────────────────────
    pendingRequests: EntryRequest[];
    entries: Entry[];
    invitePasses: InvitePass[];
    isLoading: boolean;

    // ── Actions ────────────────────────────────────────────────────────────
    fetchPendingRequests: () => Promise<void>;
    fetchEntries: (params?: gateService.GetEntriesParams) => Promise<void>;
    fetchInvitePasses: () => Promise<void>;
    approveRequest: (id: string) => Promise<void>;
    rejectRequest: (id: string, reason?: string) => Promise<void>;
    reset: () => void;
}

export const useGateStore = create<GateState>((set, get) => ({
    pendingRequests: [],
    entries: [],
    invitePasses: [],
    isLoading: false,

    reset: () =>
        set({
            pendingRequests: [],
            entries: [],
            invitePasses: [],
            isLoading: false,
        }),

    fetchPendingRequests: async () => {
        set({ isLoading: true });
        try {
            const pendingRequests = await gateService.getEntryRequests({
                status: 'PENDING',
            });
            set({ pendingRequests });
        } catch (err) {
            console.error('fetchPendingRequests failed:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchEntries: async (params?) => {
        set({ isLoading: true });
        try {
            const entries = await gateService.getEntries(params);
            set({ entries });
        } catch (err) {
            console.error('fetchEntries failed:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchInvitePasses: async () => {
        set({ isLoading: true });
        try {
            const invitePasses = await gateService.getMyInvitePasses('ACTIVE');
            set({ invitePasses });
        } catch (err) {
            console.error('fetchInvitePasses failed:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    approveRequest: async (id: string) => {
        // Optimistic remove
        set((state) => ({
            pendingRequests: state.pendingRequests.filter((r) => r.id !== id),
        }));
        try {
            await gateService.approveEntryRequest(id);
        } catch (err) {
            console.error('approveRequest failed:', err);
            // Revert by re-fetching
            await get().fetchPendingRequests();
            throw err;
        }
    },

    rejectRequest: async (id: string, reason?: string) => {
        // Optimistic remove
        set((state) => ({
            pendingRequests: state.pendingRequests.filter((r) => r.id !== id),
        }));
        try {
            await gateService.rejectEntryRequest(id, reason);
        } catch (err) {
            console.error('rejectRequest failed:', err);
            // Revert by re-fetching
            await get().fetchPendingRequests();
            throw err;
        }
    },
}));
