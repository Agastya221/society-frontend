import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type {
    City,
    Society,
    Block,
    Flat,
    ResidentType,
    UploadedDocument,
    OnboardingStatusType,
} from '../types/onboarding.types';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const ONBOARDING_STATE_KEY = 'sgate_onboarding_draft';

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface OnboardingState {
    // ── Selection State ──
    selectedCity: City | null;
    selectedSociety: Society | null;
    selectedBlock: Block | null;
    selectedFlat: Flat | null;
    residentType: ResidentType | null;
    isLivingHere: boolean | null;
    uploadedDocuments: UploadedDocument[];
    onboardingStatus: OnboardingStatusType | null;

    // ── Actions ──
    setCity: (city: City) => void;
    setSociety: (society: Society) => void;
    setBlock: (block: Block) => void;
    setFlat: (flat: Flat) => void;
    setResidentType: (type: ResidentType) => void;
    setIsLivingHere: (value: boolean) => void;
    addDocument: (doc: UploadedDocument) => void;
    removeDocument: (type: string) => void;
    clearDocuments: () => void;
    setOnboardingStatus: (status: OnboardingStatusType) => void;
    resetOnboarding: () => void;
    persistDraft: () => Promise<void>;
    loadDraft: () => Promise<void>;
    getCurrentStep: () => number;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    selectedCity: null as City | null,
    selectedSociety: null as Society | null,
    selectedBlock: null as Block | null,
    selectedFlat: null as Flat | null,
    residentType: null as ResidentType | null,
    isLivingHere: null as boolean | null,
    uploadedDocuments: [] as UploadedDocument[],
    onboardingStatus: null as OnboardingStatusType | null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    ...initialState,

    setCity: (city) => {
        set({
            selectedCity: city,
            // Reset downstream selections when city changes
            selectedSociety: null,
            selectedBlock: null,
            selectedFlat: null,
            residentType: null,
            isLivingHere: null,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    setSociety: (society) => {
        set({
            selectedSociety: society,
            // Reset downstream when society changes
            selectedBlock: null,
            selectedFlat: null,
            residentType: null,
            isLivingHere: null,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    setBlock: (block) => {
        set({
            selectedBlock: block,
            selectedFlat: null,
            residentType: null,
            isLivingHere: null,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    setFlat: (flat) => {
        set({
            selectedFlat: flat,
            residentType: null,
            isLivingHere: null,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    setResidentType: (type) => {
        set({
            residentType: type,
            isLivingHere: type === 'TENANT' ? true : null,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    setIsLivingHere: (value) => {
        set({ isLivingHere: value });
        get().persistDraft();
    },

    addDocument: (doc) => {
        set((state) => ({
            uploadedDocuments: [
                ...state.uploadedDocuments.filter((d) => d.type !== doc.type),
                doc,
            ],
        }));
        get().persistDraft();
    },

    removeDocument: (type) => {
        set((state) => ({
            uploadedDocuments: state.uploadedDocuments.filter((d) => d.type !== type),
        }));
        get().persistDraft();
    },

    clearDocuments: () => {
        set({ uploadedDocuments: [] });
        get().persistDraft();
    },

    setOnboardingStatus: (status) => set({ onboardingStatus: status }),

    resetOnboarding: () => {
        set(initialState);
        AsyncStorage.removeItem(ONBOARDING_STATE_KEY).catch(() => {});
    },

    persistDraft: async () => {
        try {
            const state = get();
            const draft = {
                selectedCity: state.selectedCity,
                selectedSociety: state.selectedSociety,
                selectedBlock: state.selectedBlock,
                selectedFlat: state.selectedFlat,
                residentType: state.residentType,
                isLivingHere: state.isLivingHere,
                uploadedDocuments: state.uploadedDocuments,
            };
            await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(draft));
        } catch {
            // Silently fail — non-critical
        }
    },

    loadDraft: async () => {
        try {
            const raw = await AsyncStorage.getItem(ONBOARDING_STATE_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                set({
                    selectedCity: draft.selectedCity ?? null,
                    selectedSociety: draft.selectedSociety ?? null,
                    selectedBlock: draft.selectedBlock ?? null,
                    selectedFlat: draft.selectedFlat ?? null,
                    residentType: draft.residentType ?? null,
                    isLivingHere: draft.isLivingHere ?? null,
                    uploadedDocuments: draft.uploadedDocuments ?? [],
                });
            }
        } catch {
            // Silently fail
        }
    },

    getCurrentStep: () => {
        const state = get();
        if (!state.selectedCity) return 1;
        if (!state.selectedSociety) return 2;
        if (!state.selectedBlock) return 3;
        if (!state.selectedFlat) return 4;
        if (!state.residentType) return 5;
        if (state.uploadedDocuments.length === 0) return 6;
        return 7;
    },
}));
