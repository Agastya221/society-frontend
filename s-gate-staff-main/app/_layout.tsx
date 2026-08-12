import { Colors } from '../src/constants/theme';
import { useAuth } from '../src/store/auth';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  const { ready, token, hydrate } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!ready) return;
    const login = segments[0] === 'login';
    if (!token && !login) router.replace('/login');
    if (token && login) router.replace('/');
  }, [ready, token, segments, router]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={Colors.gold} /></View>;
  return <SafeAreaProvider><Stack screenOptions={{ animation: 'none', headerShadowVisible: false, contentStyle: { backgroundColor: Colors.bg }, headerTitleStyle: { fontWeight: '800' } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ headerShown: false }} /><Stack.Screen name="pass" options={{ title: 'My Gate Pass' }} /><Stack.Screen name="schedule" options={{ title: 'My Schedule' }} /><Stack.Screen name="bookings" options={{ title: 'Work Requests' }} /><Stack.Screen name="profile" options={{ title: 'My Profile' }} /></Stack><StatusBar style="dark" /></SafeAreaProvider>;
}
