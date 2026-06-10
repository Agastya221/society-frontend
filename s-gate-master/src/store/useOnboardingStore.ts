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
    flowMode: 'initial' | 'addMembership';
    returnTo: string | null;
    sourceRequestId: string | null;
    sourceRequestStatus: OnboardingStatusType | null;

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
    startAddMembershipFlow: (returnTo: string) => void;
    startRequestCorrectionFlow: (data: {
        returnTo: string;
        sourceRequestId: string | null;
        sourceRequestStatus: OnboardingStatusType | null;
        selectedCity: City;
        selectedSociety: Society;
        selectedBlock: Block;
        selectedFlat: Flat;
        residentType: ResidentType;
        isLivingHere: boolean;
    }) => void;
    resetOnboarding: () => void;
    persistDraft: () => Promise<void>;
    loadDraft: () => Promise<void>;
    getCurrentStep: () => number;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    flowMode: 'initial' as 'initial' | 'addMembership',
    returnTo: null as string | null,
    sourceRequestId: null as string | null,
    sourceRequestStatus: null as OnboardingStatusType | null,
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

    startAddMembershipFlow: (returnTo) => {
        set({
            ...initialState,
            flowMode: 'addMembership',
            returnTo,
        });
        get().persistDraft();
    },

    startRequestCorrectionFlow: (data) => {
        set({
            ...initialState,
            flowMode: 'addMembership',
            returnTo: data.returnTo,
            sourceRequestId: data.sourceRequestId,
            sourceRequestStatus: data.sourceRequestStatus,
            selectedCity: data.selectedCity,
            selectedSociety: data.selectedSociety,
            selectedBlock: data.selectedBlock,
            selectedFlat: data.selectedFlat,
            residentType: data.residentType,
            isLivingHere: data.residentType === 'TENANT' ? true : data.isLivingHere,
            uploadedDocuments: [],
        });
        get().persistDraft();
    },

    resetOnboarding: () => {
        set(initialState);
        AsyncStorage.removeItem(ONBOARDING_STATE_KEY).catch(() => {});
    },

    persistDraft: async () => {
        try {
            const state = get();
            const draft = {
                flowMode: state.flowMode,
                returnTo: state.returnTo,
                sourceRequestId: state.sourceRequestId,
                sourceRequestStatus: state.sourceRequestStatus,
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
                    flowMode: draft.flowMode ?? 'initial',
                    returnTo: draft.returnTo ?? null,
                    sourceRequestId: draft.sourceRequestId ?? null,
                    sourceRequestStatus: draft.sourceRequestStatus ?? null,
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
