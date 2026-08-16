import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

type AvatarSize = number | 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<string, number> = { sm: 36, md: 44, lg: 72 };

function resolveSize(size: AvatarSize): number {
  if (typeof size === 'string') return SIZE_MAP[size] ?? 40;
  return size;
}

/** Convert a hex color to rgba with the given opacity (0–1). */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface AvatarProps {
  name: string;
  size?: AvatarSize;
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

export function Avatar({ name, size = 40, photoUrl, color }: AvatarProps) {
  const px = resolveSize(size);
  // When a color is explicitly provided: tinted bg at 12% opacity, full-color text.
  // When auto-picked from palette: solid bg with contrast text.
  const paletteColor = color ?? pickColor(name);
  const bg = color ? hexToRgba(color, 0.12) : paletteColor;
  const textColor = color ? color : textColorForBg(paletteColor);
  const initials = getInitials(name);
  const fontSize = Math.round(px * 0.38);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.container,
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: photoUrl ? 'transparent' : bg,
        },
      ]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: px, height: px, borderRadius: px / 2 }}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize,
              color: textColor,
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
