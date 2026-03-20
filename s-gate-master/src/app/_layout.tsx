import * as NavigationBar from "expo-navigation-bar";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { useSoraFonts } from "../hooks/useFonts";
import { useAuthStore } from "../store/useAuthStore";
import { SgateColors } from "../constants/Sgate-theme";

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
  }, []);

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

    const inAuthGroup     = segments[0] === undefined || segments[0] === 'login';
    const inOnboardingSplash = segments[0] === 'onboarding';
    const inAdminGroup    = segments[0] === '(admin)';
    const inResidentGroup = segments[0] === '(resident)';
    const inOnboarding    = segments[0] === '(onboarding)';
    const inSuperAdmin    = segments[0] === '(superadmin)';

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
  }, [isAuthenticated, isLoading, role, requiresOnboarding, segments, onboardingChecked, hasSeenOnboarding]);

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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SgateColors.card }}>
          <ActivityIndicator size="large" color={SgateColors.gold} />
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Slot />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
