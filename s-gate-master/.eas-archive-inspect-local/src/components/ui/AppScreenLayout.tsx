import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

/**
 * Global spacing between header and scrollable content.
 * Used by AppScreenLayout to ensure a consistent, persistent gap
 * that does NOT scroll away — identical across every screen.
 */
export const HEADER_CONTENT_GAP = 6;

export interface AppScreenLayoutProps {
  /** Header title */
  title: string;
  /** Show back arrow (default: true) */
  showBack?: boolean;
  /** Custom back handler */
  onBack?: () => void;
  /** Right-side element (e.g. icon button, badge) */
  rightElement?: React.ReactNode;
  /** Screen content — typically a ScrollView or FlatList */
  children: React.ReactNode;
}

/**
 * App-wide screen layout wrapper that provides:
 * 1. Edge-to-edge header extending behind the status bar
 * 2. Consistent bottom border + subtle shadow on the header
 * 3. A persistent spacer between header and content that never scrolls away
 *
 * Usage:
 * ```tsx
 * <AppScreenLayout title="My Bookings">
 *   <ScrollView>
 *     {content}
 *   </ScrollView>
 * </AppScreenLayout>
 * ```
 */
export function AppScreenLayout({
  title,
  showBack = true,
  onBack,
  rightElement,
  children,
}: AppScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={[S.headerContainer, { paddingTop: insets.top }]}>
        <View style={S.headerInner}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text style={S.headerTitle} numberOfLines={1}>{title}</Text>
          {rightElement ? (
            <View style={S.headerRight}>{rightElement}</View>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
      </View>

      {/* ─── Persistent Spacer — never scrolls away ───────────────── */}
      <View style={S.topSpacer} />

      {/* ─── Screen Content ───────────────────────────────────────── */}
      {children}
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  headerContainer: {
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginLeft: 12,
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  topSpacer: {
    height: HEADER_CONTENT_GAP,
    backgroundColor: SgateColors.bg,
  },
});
