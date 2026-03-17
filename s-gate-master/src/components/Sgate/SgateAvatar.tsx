import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface SgateAvatarProps {
  name: string;
  size?: number;
  photoUrl?: string;
  color?: string;
}

const PALETTE = [
  SgateColors.gold,
  SgateColors.violet,
  SgateColors.blue,
  SgateColors.green,
  SgateColors.red,
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickColor(name: string): string {
  return PALETTE[hashName(name) % PALETTE.length];
}

// Dark text on light backgrounds (gold/green), white on dark (violet/blue/red)
const LIGHT_BACKGROUNDS = new Set<string>([SgateColors.gold, SgateColors.green]);
function textColorForBg(bg: string): string {
  return LIGHT_BACKGROUNDS.has(bg) ? SgateColors.black : '#FFFFFF';
}

export function SgateAvatar({ name, size = 40, photoUrl, color }: SgateAvatarProps) {
  const bg = color ?? pickColor(name);
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: photoUrl ? 'transparent' : bg,
        },
      ]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize,
              color: textColorForBg(bg),
              fontFamily: SgateFonts.bold,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    lineHeight: undefined,
  },
});
