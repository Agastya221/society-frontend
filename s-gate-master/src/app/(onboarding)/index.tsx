import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppLoader } from '@/components/ui/AppLoader';
import api from '@/services/api';
import { useOnboardingStore } from '@/store/useOnboardingStore';

/**
 * Onboarding Index — Status Router
 *
 * This is the entry point for the onboarding flow.
 * It checks the user's onboarding status and redirects accordingly:
 *
 * - PENDING_APPROVAL / RESUBMIT_REQUESTED / REJECTED / APPROVED → approval-status
 * - NOT_STARTED / no status → select-city (start fresh)
 * - DRAFT / PENDING_DOCS → select-city (resume)
 */
export default function OnboardingIndex() {
    const router = useRouter();
    const loadDraft = useOnboardingStore((s) => s.loadDraft);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStatus();
    }, []);

    const checkExistingStatus = async () => {
        try {
            const res = await api.get('/resident/onboarding/status');
            const status: string | null = res.data?.data?.status ?? null;

            if (
                status === 'PENDING_APPROVAL' ||
                status === 'RESUBMIT_REQUESTED' ||
                status === 'REJECTED' ||
                status === 'APPROVED'
            ) {
                router.replace('/(onboarding)/approval-status');
                return;
            }

            // DRAFT or PENDING_DOCS — try to load saved draft and let user resume
            if (status === 'DRAFT' || status === 'PENDING_DOCS') {
                await loadDraft();
            }

            // Start the onboarding flow
            router.replace('/(onboarding)/select-city');
        } catch {
            // No existing request — start fresh
            router.replace('/(onboarding)/select-city');
        } finally {
            setChecking(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />
            <AppLoader />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
