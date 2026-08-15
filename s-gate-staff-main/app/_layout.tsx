import { Colors } from '../src/constants/theme';
import { useAuth } from '../src/store/auth';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../src/services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Layout() {
  const { ready, token, hydrate } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const registeredTokenRef = useRef<string | null>(null);
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!ready) return;
    const login = segments[0] === 'login';
    if (!token && !login) router.replace('/login');
    if (token && login) router.replace('/');
  }, [ready, token, segments, router]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.screen === 'Bookings') router.push('/bookings');
      if (data?.screen === 'StaffAttendance') router.push('/schedule');
    });
    return () => subscription.remove();
  }, [router]);

  // Register the native FCM token after staff authentication. This must use
  // getDevicePushTokenAsync (not an Expo token), because the backend sends via
  // Firebase Admin to StaffAccount.fcmToken.
  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted' || cancelled) return;
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const fcmToken = String(tokenData.data || '');
        if (!fcmToken || cancelled || registeredTokenRef.current === fcmToken) return;
        await api.patch('/staff-app/fcm-token', {
          fcmToken,
          deviceType: Platform.OS,
        });
        registeredTokenRef.current = fcmToken;
        console.log('📲 Staff FCM token registered');
      } catch (error) {
        // A development build without Firebase/notification credentials can
        // still be used for app testing; token registration is non-blocking.
        console.log('Staff FCM token registration skipped:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, token]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={Colors.gold} /></View>;
  return <SafeAreaProvider><Stack screenOptions={{ animation: 'none', headerShadowVisible: false, contentStyle: { backgroundColor: Colors.bg }, headerTitleStyle: { fontWeight: '800' } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ headerShown: false }} /><Stack.Screen name="pass" options={{ title: 'My Gate Pass' }} /><Stack.Screen name="schedule" options={{ title: 'My Schedule' }} /><Stack.Screen name="bookings" options={{ title: 'Work Requests' }} /><Stack.Screen name="profile" options={{ title: 'My Profile' }} /></Stack><StatusBar style="dark" /></SafeAreaProvider>;
}
