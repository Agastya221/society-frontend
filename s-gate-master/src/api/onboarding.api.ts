import api from '../services/api';
import type {
    Society,
    Block,
    Flat,
    OnboardingRequestPayload,
    OnboardingSubmitResponse,
    OnboardingStatusResponse,
    ApiEnvelope,
    SocietySearchParams,
} from '../types/onboarding.types';

// ─── Society Search ───────────────────────────────────────────────────────────

export const searchSocieties = async (
    params?: SocietySearchParams
): Promise<Society[]> => {
    const queryParams: Record<string, string> = {};
    if (params?.city) queryParams.city = params.city;
    if (params?.search?.trim()) queryParams.search = params.search.trim();

    const res = await api.get<ApiEnvelope<Society[]>>(
        '/resident/onboarding/societies',
        { params: queryParams }
    );
    return res.data?.data ?? [];
};

// ─── Blocks ───────────────────────────────────────────────────────────────────

export const getBlocks = async (societyId: string): Promise<Block[]> => {
    const res = await api.get<ApiEnvelope<Block[]>>(
        `/resident/onboarding/societies/${societyId}/blocks`
    );
    return res.data?.data ?? [];
};

// ─── Flats ────────────────────────────────────────────────────────────────────

export const getFlats = async (
    societyId: string,
    blockId: string
): Promise<Flat[]> => {
    const res = await api.get<ApiEnvelope<Flat[]>>(
        `/resident/onboarding/societies/${societyId}/blocks/${blockId}/flats`
    );
    return res.data?.data ?? [];
};

// ─── Submit Onboarding Request ────────────────────────────────────────────────

export const submitOnboardingRequest = async (
    payload: OnboardingRequestPayload
): Promise<OnboardingSubmitResponse> => {
    const res = await api.post<ApiEnvelope<OnboardingSubmitResponse>>(
        '/resident/onboarding/request',
        payload
    );
    return res.data.data;
};

export const resubmitOnboardingRequest = async (
    requestId: string,
    payload: OnboardingRequestPayload
): Promise<OnboardingSubmitResponse> => {
    const res = await api.patch<ApiEnvelope<OnboardingSubmitResponse>>(
        `/resident/onboarding/requests/${requestId}/resubmit`,
        payload
    );
    return res.data.data;
};

export const reapplyOnboardingRequest = async (
    requestId: string,
    payload: OnboardingRequestPayload
): Promise<OnboardingSubmitResponse> => {
    const res = await api.patch<ApiEnvelope<OnboardingSubmitResponse>>(
        `/resident/onboarding/requests/${requestId}/reapply`,
        payload
    );
    return res.data.data;
};

// ─── Get Onboarding Status ───────────────────────────────────────────────────

export const getOnboardingStatus = async (): Promise<OnboardingStatusResponse> => {
    const res = await api.get<ApiEnvelope<OnboardingStatusResponse>>(
        '/resident/onboarding/status'
    );
    return res.data.data;
};
