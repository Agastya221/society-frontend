import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    searchSocieties,
    getBlocks,
    getFlats,
    submitOnboardingRequest,
    getOnboardingStatus,
} from '../api/onboarding.api';
import type {
    SocietySearchParams,
    OnboardingRequestPayload,
} from '../types/onboarding.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const onboardingKeys = {
    all: ['onboarding'] as const,
    societies: (params?: SocietySearchParams) =>
        [...onboardingKeys.all, 'societies', params] as const,
    blocks: (societyId: string) =>
        [...onboardingKeys.all, 'blocks', societyId] as const,
    flats: (societyId: string, blockId: string) =>
        [...onboardingKeys.all, 'flats', societyId, blockId] as const,
    status: () => [...onboardingKeys.all, 'status'] as const,
};

// ─── useSocieties ─────────────────────────────────────────────────────────────

export function useSocieties(params?: SocietySearchParams, enabled = true) {
    return useQuery({
        queryKey: onboardingKeys.societies(params),
        queryFn: () => searchSocieties(params),
        enabled,
        staleTime: 30_000,       // 30s — societies don't change often
        gcTime: 5 * 60_000,     // 5min cache
        retry: 2,
        placeholderData: (prev) => prev, // Keep previous data while fetching
    });
}

// ─── useBlocks ────────────────────────────────────────────────────────────────

export function useBlocks(societyId: string | undefined) {
    return useQuery({
        queryKey: onboardingKeys.blocks(societyId ?? ''),
        queryFn: () => getBlocks(societyId!),
        enabled: !!societyId,
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: 2,
    });
}

// ─── useFlats ─────────────────────────────────────────────────────────────────

export function useFlats(societyId: string | undefined, blockId: string | undefined) {
    return useQuery({
        queryKey: onboardingKeys.flats(societyId ?? '', blockId ?? ''),
        queryFn: () => getFlats(societyId!, blockId!),
        enabled: !!societyId && !!blockId,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
    });
}

// ─── useOnboardingStatus ──────────────────────────────────────────────────────

export function useOnboardingStatus(enabled = true, poll = false) {
    return useQuery({
        queryKey: onboardingKeys.status(),
        queryFn: getOnboardingStatus,
        enabled,
        staleTime: 10_000,
        refetchInterval: poll ? 30_000 : false,  // Poll every 30s when waiting
        retry: 1,
    });
}

// ─── useSubmitOnboarding ──────────────────────────────────────────────────────

export function useSubmitOnboarding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: OnboardingRequestPayload) =>
            submitOnboardingRequest(payload),
        onSuccess: () => {
            // Invalidate status so it refetches
            queryClient.invalidateQueries({
                queryKey: onboardingKeys.status(),
            });
        },
    });
}
