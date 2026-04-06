import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getMyEmergencies } from '../services/emergency';

interface ActiveEmergency {
  id: string;
  type: string;
  status: string;
}

interface EmergencyContextValue {
  hasActiveEmergency: boolean;
  activeEmergency: ActiveEmergency | null;
  dismissAlert: (id?: string) => void;
}

const EmergencyContext = createContext<EmergencyContextValue>({
  hasActiveEmergency: false,
  activeEmergency: null,
  dismissAlert: () => {},
});

const dismissedIds = new Set<string>();

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [activeEmergency, setActiveEmergency] = useState<ActiveEmergency | null>(null);
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
  const dismissedRef = useRef(dismissedIds);

  const dismissAlert = useCallback((id?: string) => {
    const targetId = id ?? activeEmergency?.id;
    if (targetId) {
      dismissedIds.add(targetId);
      dismissedRef.current = dismissedIds;
    }
    setHasActiveEmergency(false);
    setActiveEmergency(null);
  }, [activeEmergency?.id]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkEmergencies = async () => {
      try {
        const emergencies = await getMyEmergencies();
        if (!isMounted) return;

        const active = emergencies.find(
          (e) =>
            (e.status === 'TRIGGERED' || e.status === 'ACKNOWLEDGED' || e.status === 'ACTIVE') &&
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
      } catch {
        if (!isMounted) return;
        timeoutId = setTimeout(checkEmergencies, 30000);
      }
    };

    checkEmergencies();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <EmergencyContext.Provider value={{ hasActiveEmergency, activeEmergency, dismissAlert }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useActiveEmergency() {
  return useContext(EmergencyContext);
}
