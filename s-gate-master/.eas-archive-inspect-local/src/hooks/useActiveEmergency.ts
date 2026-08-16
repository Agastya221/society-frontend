import { useEffect, useRef, useState } from 'react';
import { getMyEmergencies } from '../services/emergency';

// Module-level dismissed set — persists for the entire JS session so that
// dismissing an emergency keeps it silent even if the hook re-mounts.
const dismissedIds = new Set<string>();

export interface ActiveEmergency {
  id: string;
  type: string;
  status: string;
}

export function useActiveEmergency() {
  const [activeEmergency, setActiveEmergency] = useState<ActiveEmergency | null>(null);
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
  const dismissedRef = useRef<Set<string>>(dismissedIds);

  // dismissAlert — pass an optional id, or omit to dismiss whatever is currently active
  const dismissAlert = (id?: string) => {
    const targetId = id ?? activeEmergency?.id;
    if (targetId) {
      console.log('🛑 Dismissing emergency:', targetId);
      dismissedIds.add(targetId);
      dismissedRef.current = dismissedIds;
    }
    setHasActiveEmergency(false);
    setActiveEmergency(null);
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkEmergencies = async () => {
      try {
        const emergencies = await getMyEmergencies();

        if (!isMounted) return;

        const active = emergencies.find(
          (e) =>
            (e.status === 'TRIGGERED' ||
              e.status === 'ACKNOWLEDGED' ||
              e.status === 'ACTIVE') &&
            !dismissedRef.current.has(e.id)
        );

        if (active) {
          setActiveEmergency({ id: active.id, type: active.type, status: active.status });
          setHasActiveEmergency(true);
        } else {
          setActiveEmergency(null);
          setHasActiveEmergency(false);
        }

        timeoutId = setTimeout(checkEmergencies, 15000);
      } catch (error: any) {
        if (!isMounted) return;
        const isNetworkError = !error.response;
        const delay = isNetworkError ? 30000 : 15000;
        timeoutId = setTimeout(checkEmergencies, delay);
      }
    };

    checkEmergencies();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return { hasActiveEmergency, activeEmergency, dismissAlert };
}
