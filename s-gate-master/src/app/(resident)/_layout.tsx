import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { AppState, Vibration, View } from 'react-native';
import { EmergencyOverlay } from '../../components/emergency/EmergencyOverlay';
import { useActiveEmergency } from '../../hooks/useActiveEmergency';

export default function ResidentLayout() {
  const { hasActiveEmergency, dismissAlert } = useActiveEmergency();
  const soundRef = useRef<Audio.Sound | null>(null);
  const vibrationInterval = useRef<any>(null);

  useEffect(() => {
    console.log('🚨 ResidentLayout: hasActiveEmergency changed to:', hasActiveEmergency);
    let isMounted = true;

    // 1. Setup Audio
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

    // 2. Vibration Loop
    const startVibration = () => {
        console.log('📳 Starting vibration interval...');
        if (vibrationInterval.current) clearInterval(vibrationInterval.current);
        
        // Vibrate immediately
        Vibration.vibrate(500);
        
        // Loop every 2.5s
        vibrationInterval.current = setInterval(() => {
            Vibration.vibrate(500);
        }, 2500);
    };

    const stopVibration = () => {
        if (vibrationInterval.current) {
            clearInterval(vibrationInterval.current);
            vibrationInterval.current = null;
        }
        Vibration.cancel();
    };

    // 3. Main Trigger Logic
    if (hasActiveEmergency) {
        setupAudio();
        if (AppState.currentState === 'active') {
            startVibration();
        }
    } else {
        stopVibration();
        if (soundRef.current) {
            soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
        }
    }

    // 4. AppState Handling
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
        if (soundRef.current) {
            soundRef.current.unloadAsync().catch(() => {});
        }
        subscription.remove();
    };
  }, [hasActiveEmergency]);

  return (
    <View style={{ flex: 1 }}>
      {hasActiveEmergency && <EmergencyOverlay onDismiss={dismissAlert} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="approvals/index" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
