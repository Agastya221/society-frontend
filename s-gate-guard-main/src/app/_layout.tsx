import { useAuthStore } from '@/store/useAuthStore';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import api from '@/services/api';
import { GuardColors, GuardFonts } from '@/constants/theme';

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadToken } = useAuthStore();

  // Load stored token on app launch
  useEffect(() => {
    loadToken();
  }, [loadToken]);

  // Register native FCM token after authentication
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const fcmToken = tokenData.data as string;
        await api.patch('/users/guard-app/fcm-token', {
          fcmToken,
          deviceType: Platform.OS,
        });
        console.log('📲 Guard FCM token registered');
      } catch (err) {
        console.log('Guard FCM token registration skipped:', err);
      }
    })();
  }, [isAuthenticated]);

  // Navigate to approvals when an approval-related notification is tapped
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if (data?.type === 'GATE_APPROVED' || data?.type === 'GATE_DENIED') {
        router.push('/approvals');
      }
    });
    return () => sub.remove();
  }, [router]);

  // Handle authentication-based navigation
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to auth screen if not authenticated
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if already authenticated
      router.replace('/');
    }
  }, [isAuthenticated, segments, isLoading, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: GuardColors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={GuardColors.goldDeep} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: GuardColors.bg },
        animation: 'none',
        headerStyle: { backgroundColor: GuardColors.card },
        headerTintColor: GuardColors.t1,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: GuardFonts.semibold, fontWeight: '700', fontSize: 17 },
      }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="new-entry" 
          options={{ 
            presentation: 'card', 
            headerShown: true,
            title: 'New Entry',
          }} 
        />
        <Stack.Screen 
          name="today-entries" 
          options={{ 
            headerShown: true,
            title: "Today's Entries",
          }} 
        />
        <Stack.Screen 
          name="approvals" 
          options={{ 
            headerShown: true,
            title: 'Approval Status',
          }} 
        />
        <Stack.Screen 
          name="staff-scan" 
          options={{ 
            headerShown: true,
            title: 'Staff Scan',
          }} 
        />
        <Stack.Screen
          name="scan-verify"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="entry-waiting"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="emergencies"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="profile" 
          options={{ 
            headerShown: true,
            title: 'My Profile',
          }} 
        />
      </Stack>
      <StatusBar style="dark" backgroundColor={GuardColors.card} />
    </>
  );
}
