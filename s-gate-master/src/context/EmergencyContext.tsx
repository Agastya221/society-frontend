import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
  refreshEmergencies: () => void;
}

const EmergencyContext = createContext<EmergencyContextValue>({
  hasActiveEmergency: false,
  activeEmergency: null,
  dismissAlert: () => {},
  refreshEmergencies: () => {},
});

const dismissedIds = new Set<string>();

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [activeEmergency, setActiveEmergency] = useState<ActiveEmergency | null>(null);
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
  const dismissedRef = useRef(dismissedIds);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const dismissAlert = useCallback((id?: string) => {
    const targetId = id ?? activeEmergency?.id;
    if (targetId) {
      dismissedIds.add(targetId);
      dismissedRef.current = dismissedIds;
    }
    setHasActiveEmergency(false);
    setActiveEmergency(null);
  }, [activeEmergency?.id]);

  const checkEmergencies = useCallback(async () => {
    try {
      const emergencies = await getMyEmergencies();

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
    } catch {
      // Silent — don't spam retries. Will re-check on next foreground.
    }
  }, []);

  useEffect(() => {
    // Check once on mount
    checkEmergencies();

    // Re-check only when app returns to foreground (no polling)
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkEmergencies();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkEmergencies]);

  return (
    <EmergencyContext.Provider value={{ hasActiveEmergency, activeEmergency, dismissAlert, refreshEmergencies: checkEmergencies }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useActiveEmergency() {
  return useContext(EmergencyContext);
}
