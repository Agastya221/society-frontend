import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { Platform, Linking, AppState } from "react-native";
import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../global.css";
import { useSoraFonts } from "../hooks/useFonts";
import { useAuthStore } from "../store/useAuthStore";
import api from "../services/api";
import { AppAlertProvider, AppAlert } from "../components/ui/AppAlert";
import { AppLoader } from "../components/ui/AppLoader";

// ─── React Query Client ──────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ONBOARDING_SEEN_KEY = "onboarding_seen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, isLoading, role, requiresOnboarding, loadToken } = useAuthStore();
  const [fontsLoaded, fontError] = useSoraFonts();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load token on app launch
  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const checkInProgress = useRef(false);

  // Register FCM token & Enforce Compulsory Permissions
  useEffect(() => {
    if (!isAuthenticated || !role) return;
    if (role !== 'RESIDENT' && role !== 'ADMIN') return;
    
    const enforcePermissions = async (fromAppState = false) => {
      if (checkInProgress.current) return;
      checkInProgress.current = true;

      try {
        if (fromAppState) {
          // Android sometimes needs a few ms to sync native permission state after returning from Settings
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 1. Mandatory Notification Permission
        let notifStatus = await Notifications.getPermissionsAsync();
        
        // Force refresh from OS if not granted
        if (notifStatus.status !== 'granted') {
          const userAccepted = await new Promise<boolean>((resolve) => {
            AppAlert.show(
              'Notification Permission',
              role === 'ADMIN'
                ? 'Allow S-Gate to send you notifications so you can receive instant alerts for security events and approval requests.'
                : 'Allow S-Gate to send you notifications so you can receive instant alerts for visitor arrivals and gate activity.',
              [
                {
                  text: 'NOT NOW',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'ALLOW',
                  style: 'default',
                  onPress: () => resolve(true),
                },
              ],
              { cancelable: false, tag: 'permissions' }
            );
          });

          if (userAccepted) {
            notifStatus = await Notifications.requestPermissionsAsync();
          }
        }

        if (notifStatus.status !== 'granted') {
          const notifMsg = role === 'ADMIN'
            ? 'S-Gate requires Notification access to instantly alert you about security events and approval requests. Please enable it in Settings.'
            : 'S-Gate requires Notification access to instantly alert you about visitors and gate activity. Please enable it in Settings.';
            
          AppAlert.show(
            'Permissions Required',
            notifMsg,
            [{ text: 'OPEN SETTINGS', style: 'default', onPress: () => Linking.openSettings() }],
            { cancelable: false, tag: 'permissions' }
          );
          checkInProgress.current = false;
          return; // Stop here if denied
        }

        // 2. Mandatory Location Permission
        let locStatus = await Location.getForegroundPermissionsAsync();
        
        // Force refresh from OS if not granted
        if (locStatus.status !== 'granted') {
          const userAccepted = await new Promise<boolean>((resolve) => {
            AppAlert.show(
              'Location Permission',
              role === 'ADMIN'
                ? 'Allow S-Gate to access your location to verify you are within the society premises for security operations.'
                : 'Allow S-Gate to access your location to provide emergency SOS features and local community services.',
              [
                {
                  text: 'NOT NOW',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'ALLOW',
                  style: 'default',
                  onPress: () => resolve(true),
                },
              ],
              { cancelable: false, tag: 'permissions' }
            );
          });

          if (userAccepted) {
            locStatus = await Location.requestForegroundPermissionsAsync();
          }
        }

        if (locStatus.status !== 'granted') {
          const locMsg = role === 'ADMIN'
            ? 'S-Gate requires Location access to verify you are within the society premises for security operations. Please enable it in Settings.'
            : 'S-Gate requires Location access to provide emergency SOS features and local community services. Please enable it in Settings.';
            
          AppAlert.show(
            'Permissions Required',
            locMsg,
            [{ text: 'OPEN SETTINGS', style: 'default', onPress: () => Linking.openSettings() }],
            { cancelable: false, tag: 'permissions' }
          );
          checkInProgress.current = false;
          return; // Stop here if denied
        }

        // Both permissions granted! Hide any lingering blocking alerts
        AppAlert.hide('permissions');
        
        // 3. Register native FCM token since notifications are granted
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const fcmToken = tokenData.data as string;
        await api.patch('/users/resident-app/fcm-token', {
          fcmToken,
          deviceType: Platform.OS,
        });
        console.log('📲 FCM token registered');
      } catch (err) {
        console.log('FCM token registration skipped:', err);
      } finally {
        checkInProgress.current = false;
      }
    };

    enforcePermissions();

    // Re-check permissions when returning from settings
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        enforcePermissions(true);
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, role]);

  // Navigate to approvals when a GATE_REQUEST notification is tapped
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if (data?.type === 'GATE_REQUEST') {
        if (role === 'ADMIN') {
          router.push('/(admin)/approval-requests' as any);
        } else {
          router.push('/(resident)/approvals' as any);
        }
      } else if (data?.type === 'ONBOARDING_STATUS' && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
        router.push({
          pathname: '/(admin)/onboarding-requests',
          params: {
            requestId: data.requestId,
            status: data.status ?? 'PENDING_APPROVAL',
          },
        } as any);
      }
    });
    return () => sub.remove();
  }, [router, role]);

  // Auto-navigate to approvals when a GATE_REQUEST arrives in foreground
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any>;
      if (data?.type === 'GATE_REQUEST' && isAuthenticated) {
        if (role === 'ADMIN') {
          router.push('/(admin)/approval-requests' as any);
        } else {
          router.push('/(resident)/approvals' as any);
        }
      }
    });
    return () => sub.remove();
  }, [router, isAuthenticated, role]);

  // Check if user has seen the onboarding splash
  useEffect(() => {
    (async () => {
      try {
        const seen = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
        setHasSeenOnboarding(seen === "true");
      } catch {
        setHasSeenOnboarding(true); // fail-safe: skip onboarding
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, []);

  // Role-based navigation logic
  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === undefined || segments[0] === 'login';
    const inOnboardingSplash = segments[0] === 'onboarding';
    const inAdminGroup = segments[0] === '(admin)';
    const inResidentGroup = segments[0] === '(resident)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inSuperAdmin = segments[0] === '(superadmin)';

    // First-time user landing on root → show onboarding splash
    // Only redirect from the root (segments[0] === undefined), NOT from /login.
    // This avoids a race condition: onboarding.tsx writes to SecureStore and
    // navigates to /login, but this effect still has hasSeenOnboarding=false
    // in React state (it was read once on mount).
    if (!isAuthenticated && !hasSeenOnboarding && segments[0] === undefined) {
      router.replace('/onboarding');
      return;
    }

    // Not authenticated → login
    if (!isAuthenticated && !inAuthGroup && !inOnboardingSplash) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && role) {

      if (role === 'SUPER_ADMIN') {
        if (!inSuperAdmin) router.replace('/(superadmin)');
        return;
      }

      if (role === 'ADMIN') {
        if (!inAdminGroup) router.replace('/(admin)');
        return;
      }

      if (role === 'RESIDENT') {
        if (requiresOnboarding) {
          if (!inOnboarding) router.replace('/(onboarding)');
        } else {
          if (!inResidentGroup) router.replace('/(resident)/home');
        }
        return;
      }

      // Fallback for any other role
      if (inAuthGroup) router.replace('/(resident)/home');
    }
  }, [isAuthenticated, isLoading, role, requiresOnboarding, segments, onboardingChecked, hasSeenOnboarding, router]);

  // Hide splash screen once fonts are loaded and auth is resolved
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isLoading, onboardingChecked]);

  // Android system navigation bar setup
  useEffect(() => {
    if (Platform.OS === "android") {
      const setupNavigationBar = async () => {
        try {
          await NavigationBar.setPositionAsync("relative");
          await NavigationBar.setBackgroundColorAsync("#ffffff");
          await NavigationBar.setButtonStyleAsync("dark");
        } catch (error) {
          console.warn("NavigationBar setup failed:", error);
        }
      };
      setupNavigationBar();
    }
  }, []);

  // Wait for fonts and auth before rendering
  if (!fontsLoaded && !fontError) return null;

  // Show loading screen while checking auth
  if (isLoading || !onboardingChecked) {
    return (
      <SafeAreaProvider>
        <AppLoader />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppAlertProvider>
            <Slot />
          </AppAlertProvider>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
