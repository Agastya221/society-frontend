import { GuardColors, GuardFonts } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  on: boolean;
  busy?: boolean;
  title: string;
  hint: string;
  /** Where the phone is, e.g. "At the gate · Main Gate"; shown in the hint line, red when not ok */
  gateLine?: string | null;
  gateOk?: boolean;
  onToggle: () => void;
}

const TRACK_W = 58;
const TRACK_H = 34;
const KNOB = 28;

/** The guard's shift switch: one slim row, a real switch on the right so it is clear it can be pressed. */
export function DutyToggle({ on, busy, title, hint, gateLine, gateOk, onToggle }: Props) {
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: on ? 1 : 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [on, slide]);

  const knobX = slide.interpolate({ inputRange: [0, 1], outputRange: [3, TRACK_W - KNOB - 3] });
  const trackColor = slide.interpolate({ inputRange: [0, 1], outputRange: ['#D5D7DC', GuardColors.green] });

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: on ? GuardColors.green : GuardColors.t3 }]} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
          {gateLine ? <Text style={{ color: gateOk ? GuardColors.green : GuardColors.red, fontFamily: GuardFonts.bold }}>{`  ·  ${gateLine}`}</Text> : null}
        </Text>
      </View>
      <Pressable
        testID="duty-toggle"
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: on, busy: !!busy }}
        disabled={busy}
        onPress={onToggle}
        hitSlop={12}
      >
        <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
          <Animated.View style={[styles.knob, { left: knobX }]}>
            {busy ? <ActivityIndicator size="small" color={GuardColors.t2} /> : null}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18, paddingVertical: 8, paddingLeft: 14, paddingRight: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1 },
  title: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 17 },
  hint: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 13, marginTop: 1 },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, justifyContent: 'center' },
  knob: { position: 'absolute', width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
