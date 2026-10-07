import React, { useEffect } from 'react';
import { BackHandler, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkspaceSwitchButton } from '@/components/ui/WorkspaceSwitchButton';

export function WorkspaceOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // This page sits on its own in the admin tabs; Android back would otherwise
  // leave the app instead of returning to the admin home.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(admin)');
      return true;
    });
    return () => sub.remove();
  }, [router]);

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="account-convert" size={48} color={SgateColors.gold} />
        </View>
        <Text style={styles.title}>Switch Workspace</Text>
        <Text style={styles.description}>
          This is part of your Resident Workspace. Switch to it in one tap, or go back to admin.
        </Text>
        <View style={styles.switchRow}>
          <WorkspaceSwitchButton variant="profile" />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(admin)')}>
          <Text style={styles.buttonText}>Back to Admin Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SgateColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    backgroundColor: SgateColors.card,
    borderRadius: SgateRadius.lg,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SgateColors.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: SgateColors.black,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SgateRadius.full,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: SgateFonts.bold,
  },
});
