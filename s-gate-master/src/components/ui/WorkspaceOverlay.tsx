import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function WorkspaceOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="account-convert" size={48} color={SgateColors.gold} />
        </View>
        <Text style={styles.title}>Switch Workspace</Text>
        <Text style={styles.description}>
          This feature is only available in the Resident Workspace. Please switch workspaces using the selector on the Home or Profile screen.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(admin)')}>
          <Text style={styles.buttonText}>Back to Admin Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
