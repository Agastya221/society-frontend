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
  const { isAuthenticated, isLoading, role, loadToken } = useAuthStore();
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
    console.log('🔍 Navigation Debug:', { 
      isLoading, 
      isAuthenticated, 
      role, 
      segments,
      currentSegment: segments[0]
    });

    if (isLoading) return; // Wait for token to load

    const inAuthGroup = segments[0] === undefined || segments[0] === "login";
    const inAdminGroup = segments[0] === "(admin)";
    const inResidentGroup = segments[0] === "(resident)";

    console.log('🔍 Navigation Conditions:', {
      inAuthGroup,
      inAdminGroup,
      inResidentGroup
    });

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated, redirect to login
      console.log('➡️ Redirecting to login (not authenticated)');
      router.replace("/login");
    } else if (isAuthenticated && role) {
      // User is authenticated, route based on role
      console.log('✅ User authenticated with role:', role);
      
      if (role === "ADMIN" && !inAdminGroup) {
        console.log('➡️ Redirecting to /(admin)');
        router.replace("/(admin)");
      } else if (role === "RESIDENT" && !inResidentGroup) {
        console.log('➡️ Redirecting to /(resident)/home');
        router.replace("/(resident)/home");
      } else if (role !== "ADMIN" && role !== "RESIDENT" && inAuthGroup) {
        // Handle other roles - for now redirect to resident
        console.log('➡️ Redirecting unknown role to /(resident)/home');
        router.replace("/(resident)/home");
      } else {
        console.log('✋ Already in correct location');
      }
    }
  }, [isAuthenticated, isLoading, segments, role]);

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
