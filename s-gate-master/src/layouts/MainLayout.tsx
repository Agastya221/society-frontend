import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, AppHeaderProps } from '../components/AppHeader';
import { StatusBar } from 'expo-status-bar';

interface MainLayoutProps {
  children: React.ReactNode;
  headerProps?: AppHeaderProps;
  backgroundColor?: string;
  scrollEnabled?: boolean;
}

export function MainLayout({ 
  children, 
  headerProps, 
  backgroundColor = '#F5F7FA',
  scrollEnabled = true 
}: MainLayoutProps) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();

  // If header height is not yet calculated, use a smart guess to prevent sudden layout jumps
  // Default header ~60px height + top inset, Profile header ~90px + top inset
  const estimatedHeaderHeight = headerProps?.variant === 'profile' 
    ? insets.top + 95 
    : insets.top + 60;

  const currentTopPadding = headerHeight > 0 ? headerHeight : estimatedHeaderHeight;

  // Determine status bar style based on header background
  // Profile variant uses a white background, so the status bar must be dark to be visible
  const statusBarStyle = headerProps?.variant === 'transparent' ? 'light' : 'dark';

  return (
    <View style={{ flex: 1, backgroundColor }} className="w-full h-full relative">
      {/* 
        Ensure the Status Bar is completely transparent and overlaps 
        the screen so our AppHeader extends behind it 
      */}
      <StatusBar style={statusBarStyle} translucent backgroundColor="transparent" />
      
      {/* Global Fixed Header */}
      <AppHeader 
        {...headerProps} 
        onLayoutHeight={(h) => setHeaderHeight(h)} 
      />

      {/* Scrollable Content */}
      {scrollEnabled ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: currentTopPadding, // Ensure content starts EXACTLY below the header
            paddingBottom: insets.bottom + 30, // Safe padding at the bottom for notch devices
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: currentTopPadding }}>
          {children}
        </View>
      )}
    </View>
  );
}
