import React from 'react';
import { useRouter } from 'expo-router';
import { AppBottomNav, NavTab } from '@/components/navigation/BottomNavBar';

/**
 * Sticky bottom navigation bar for screens — replaces the old single Home pill
 * with the enterprise-grade 5-tab bar featuring the central elevated scanner FAB.
 */
export function HomeButton({
  onPress,
  activeTab,
}: {
  onPress?: () => void;
  activeTab?: NavTab;
}) {
  const router = useRouter();
  return <AppBottomNav activeTab={activeTab} onHome={onPress ?? (() => router.replace('/'))} />;
}


