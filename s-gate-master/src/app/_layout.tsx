import * as NavigationBar from "expo-navigation-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { useAuthStore } from "../store/useAuthStore";

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { isAuthenticated, isLoading, role, requiresOnboarding, loadToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setColorScheme("light");
  }, []);

  const isDark = false; // Force light mode

  // Load token on app launch
  useEffect(() => {
    loadToken();
  }, []);

  // Role-based navigation logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup     = segments[0] === undefined || segments[0] === 'login';
    const inAdminGroup    = segments[0] === '(admin)';
    const inResidentGroup = segments[0] === '(resident)';
    const inOnboarding    = segments[0] === '(onboarding)';
    const inSuperAdmin    = segments[0] === '(superadmin)';

    if (!isAuthenticated && !inAuthGroup) {
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
  }, [isAuthenticated, isLoading, role, requiresOnboarding, segments]);

  // Android system navigation bar setup (CORRECT)
  useEffect(() => {
    if (Platform.OS === "android") {
      const setupNavigationBar = async () => {
        try {
          // IMPORTANT: keep navigation bar relative (default)
          await NavigationBar.setPositionAsync("relative");

          await NavigationBar.setBackgroundColorAsync("#ffffff");

          await NavigationBar.setButtonStyleAsync("dark");
        } catch (error) {
          console.warn("NavigationBar setup failed:", error);
        }
      };

      setupNavigationBar();
    }
  }, []); // Run once

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {/* This is the real fix */}
      <Slot />

      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
