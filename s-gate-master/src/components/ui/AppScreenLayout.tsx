import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SgateColors } from '../../constants/Sgate-theme';
import { ScreenHeader } from '../layout/ScreenHeader';

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
  return (
    <View style={S.root}>
      <ScreenHeader
        title={title}
        showBack={showBack}
        onBack={onBack}
        rightElement={rightElement}
      />

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
  topSpacer: {
    height: HEADER_CONTENT_GAP,
    backgroundColor: SgateColors.bg,
  },
});
