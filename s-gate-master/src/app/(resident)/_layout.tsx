import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { AppState, Vibration, View } from 'react-native';
import { EmergencyOverlay } from '../../components/emergency/EmergencyOverlay';
import { SgateTabBar } from '../../components/Sgate';
import { EmergencyProvider, useActiveEmergency } from '../../context/EmergencyContext';

function ResidentLayoutInner() {
  const { hasActiveEmergency, activeEmergency, dismissAlert } = useActiveEmergency();
  const soundRef            = useRef<Audio.Sound | null>(null);
  const vibrationInterval   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Emergency audio + vibration logic (unchanged) ─────────────────────────
  useEffect(() => {
    console.log('🚨 ResidentLayout: hasActiveEmergency changed to:', hasActiveEmergency);
    let isMounted = true;

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/emergency.mp3'),
          { isLooping: true, volume: 1.0 }
        );
        if (isMounted) {
          soundRef.current = sound;
          if (hasActiveEmergency && AppState.currentState === 'active') {
            console.log('🔊 Playing sound...');
            await sound.playAsync();
          }
        }
      } catch (error) {
        console.log('Error loading emergency sound:', error);
      }
    };

    const startVibration = () => {
      console.log('📳 Starting vibration interval...');
      if (vibrationInterval.current) clearInterval(vibrationInterval.current);
      Vibration.vibrate(500);
      vibrationInterval.current = setInterval(() => { Vibration.vibrate(500); }, 2500);
    };

    const stopVibration = () => {
      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
      }
      Vibration.cancel();
    };

    if (hasActiveEmergency) {
      setupAudio();
      if (AppState.currentState === 'active') startVibration();
    } else {
      stopVibration();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (hasActiveEmergency) {
        if (nextAppState === 'active') {
          startVibration();
          soundRef.current?.playAsync().catch(() => {});
        } else {
          stopVibration();
          soundRef.current?.pauseAsync().catch(() => {});
        }
      }
    });

    return () => {
      isMounted = false;
      stopVibration();
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      subscription.remove();
    };
  }, [hasActiveEmergency]);

  return (
    <View style={{ flex: 1 }}>
      {hasActiveEmergency && (
        <EmergencyOverlay
          emergencyId={activeEmergency?.id}
          onDismiss={() => dismissAlert(activeEmergency?.id)}
        />
      )}

      <Tabs
        tabBar={(props) => <SgateTabBar {...props} />}
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {/* ── Visible tabs ──────────────────────────────────────────────── */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notices/index"
          options={{
            title: 'Notice',
            tabBarLabel: 'Notice',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="file-document-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="deliveries"
          options={{
            title: 'Delivery',
            tabBarLabel: 'Delivery',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="package-variant" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="society"
          options={{
            title: 'Society',
            tabBarLabel: 'Society',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={22} color={color} />,
          }}
        />

        {/* ── Hidden from tab bar — still navigable ─────────────────────── */}
        <Tabs.Screen name="local-directory/index"  options={{ href: null }} />
        <Tabs.Screen name="daily-help/index"       options={{ href: null }} />
        <Tabs.Screen name="elections/index"        options={{ href: null }} />
        <Tabs.Screen name="society-dues/index"     options={{ href: null }} />
        <Tabs.Screen name="communication/index"    options={{ href: null }} />
        <Tabs.Screen name="amenities/index"        options={{ href: null }} />
        <Tabs.Screen name="vehicles/index"         options={{ href: null }} />
        <Tabs.Screen name="documents/index"        options={{ href: null }} />
        <Tabs.Screen name="search-vehicle/index"   options={{ href: null }} />
        <Tabs.Screen name="visitors"    options={{ href: null }} />
        <Tabs.Screen name="approvals/index"   options={{ href: null }} />
        <Tabs.Screen name="complaints"  options={{ href: null }} />
        <Tabs.Screen name="emergency/index"   options={{ href: null }} />
        <Tabs.Screen name="family/index"      options={{ href: null }} />
        <Tabs.Screen name="pre-approvals/index" options={{ href: null }} />
        <Tabs.Screen name="staff/index"       options={{ href: null }} />
        <Tabs.Screen name="pre-approve" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="expect-delivery" options={{ href: null }} />
        <Tabs.Screen name="my-passes/index"       options={{ href: null }} />
        <Tabs.Screen name="household"     options={{ href: null }} />
      </Tabs>
    </View>
  );
}

export default function ResidentLayout() {
  return (
    <EmergencyProvider>
      <ResidentLayoutInner />
    </EmergencyProvider>
  );
}
