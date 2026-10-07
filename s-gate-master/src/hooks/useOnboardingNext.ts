import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isReadyForReview, useOnboardingStore } from '@/store/useOnboardingStore';

type OnboardingNextRoute =
    | '/(onboarding)/select-block'
    | '/(onboarding)/select-flat'
    | '/(onboarding)/resident-type'
    | '/(onboarding)/document-upload';

/**
 * Forward navigation for KYC steps. When the step was opened from Review's
 * "Edit" (`returnTo=review`) and every step is still complete, Continue goes
 * straight back to Review instead of making the user redo the later steps.
 * If the edit invalidated downstream data, the normal next step is used.
 */
export function useOnboardingNext() {
    const router = useRouter();
    const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

    return useCallback(
        (next: OnboardingNextRoute) => {
            if (returnTo === 'review' && isReadyForReview(useOnboardingStore.getState())) {
                router.push('/(onboarding)/review-submit');
                return;
            }
            router.push(next);
        },
        [returnTo, router]
    );
}
