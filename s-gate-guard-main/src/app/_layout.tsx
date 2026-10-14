import { useAuthStore } from '@/store/useAuthStore';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import api from '@/services/api';
import { GuardColors, GuardFonts } from '@/constants/theme';
import { useLanguageStore, useT } from '@/i18n';

// Android measures a Text with one line-breaking strategy and draws it with another,
// so Devanagari labels in auto-width boxes were drawn one word short ("ड्यूटी पर" showed
// as "ड्यूटी"). The simple strategy measures and draws the same way.
if (Platform.OS === 'android') {
  const AnyText = Text as unknown as { render?: (props: Record<string, unknown>, ref: unknown) => unknown };
  const originalRender = AnyText.render;
  if (typeof originalRender === 'function') {
    AnyText.render = function patchedRender(this: unknown, props: Record<string, unknown>, ref: unknown) {
      return originalRender.call(this, { textBreakStrategy: 'simple', ...props }, ref);
    };
  }
}

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
  const { isAuthenticated, isLoading, loadToken } = useAuthStore();
  const t = useT();
  const loadLang = useLanguageStore((state) => state.loadLang);

  // Saved language (Hindi by default)
  useEffect(() => {
    loadLang();
  }, [loadLang]);

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

  // Auth routing is declarative (Stack.Protected below): signed-out users only
  // ever mount /auth, so the dashboard never renders (or fires API calls)
  // before the redirect, and nothing navigates before the navigator mounts.

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
        headerTitleStyle: { fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 22 },
      }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="new-entry" 
          options={{ 
            presentation: 'card', 
            // The screen draws its own big header with step dots.
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="today-entries" 
          options={{ 
            headerShown: true,
            title: t('title.entries'),
          }} 
        />
        <Stack.Screen 
          name="approvals" 
          options={{ 
            headerShown: true,
            title: t('title.waiting'),
          }} 
        />
        <Stack.Screen 
          name="staff-scan" 
          options={{ 
            headerShown: true,
            title: t('title.staffScan'),
          }} 
        />
        <Stack.Screen
          name="pre-approved"
          options={{
            headerShown: true,
            title: t('title.preApproved'),
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
            title: t('title.profile'),
          }}
        />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" backgroundColor={GuardColors.card} />
    </>
  );
}
