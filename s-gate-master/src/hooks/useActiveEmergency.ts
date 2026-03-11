import { useEffect, useRef, useState } from 'react';
import { EmergencyResponse, getMyEmergencies } from '../services/emergency';

export function useActiveEmergency() {
    const [activeEmergency, setActiveEmergency] = useState<EmergencyResponse | null>(null);
    const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
    const dismissedIdRef = useRef<string | null>(null);

    const dismissAlert = () => {
        if (activeEmergency) {
            console.log('🛑 Dismissing emergency:', activeEmergency.id);
            dismissedIdRef.current = activeEmergency.id;
            setHasActiveEmergency(false);
            setActiveEmergency(null);
        }
    };

    // Poll for active emergencies
    useEffect(() => {
        let isMounted = true;
        let timeoutId: any;

        const checkEmergencies = async () => {
            try {
                const emergencies = await getMyEmergencies();
                console.log('🚑 Polling Check:', emergencies.length, 'total');
                if (emergencies.length > 0) {
                    console.log('🚑 Statuses:', emergencies.map(e => e.status));
                }

                // Filter for ACTIVE (TRIGGERED, ACKNOWLEDGED, or ACTIVE) emergencies
                // Ignore dismissed emergencies
                const active = emergencies.find(e =>
                    (e.status === 'TRIGGERED' || e.status === 'ACKNOWLEDGED' || e.status === 'ACTIVE') &&
                    e.id !== dismissedIdRef.current
                );

                if (isMounted) {
                    if (active) {
                        setActiveEmergency(active);
                        setHasActiveEmergency(true);
                    } else {
                        setActiveEmergency(null);
                        setHasActiveEmergency(false);
                    }
                    // Success: Poll again in 10s
                    timeoutId = setTimeout(checkEmergencies, 10000);
                }
            } catch (error: any) {
                // If it's a network error, back off to avoid spam
                const isNetworkError = error.message === 'Network Error' || error.message?.includes('Network Error');
                const delay = isNetworkError ? 30000 : 10000;

                if (!isNetworkError) {
                    console.log('Emergency poll failed:', error);
                } else {
                    console.log('Emergency poll paused (Network Error). Retrying in 30s...');
                }

                if (isMounted) {
                    timeoutId = setTimeout(checkEmergencies, delay);
                }
            }
        };

        // Initial check
        checkEmergencies();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    return { hasActiveEmergency, activeEmergency, dismissAlert };
}
