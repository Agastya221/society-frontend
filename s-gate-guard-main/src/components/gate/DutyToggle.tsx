import { GuardColors, GuardFonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  on: boolean;
  busy?: boolean;
  title: string;
  hint: string;
  /** Second line under the hint, e.g. "At the gate · Main Gate" */
  gateLine?: string | null;
  gateOk?: boolean;
  onToggle: () => void;
}

const TRACK_W = 76;
const TRACK_H = 44;
const KNOB = 36;

/**
 * The guard's shift switch. A real switch (big, with a sliding knob) so it is obvious it can be pressed,
 * on a card that says what state the shift is in and whether the phone is at the gate.
 */
export function DutyToggle({ on, busy, title, hint, gateLine, gateOk, onToggle }: Props) {
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: on ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [on, slide]);

  const knobX = slide.interpolate({ inputRange: [0, 1], outputRange: [4, TRACK_W - KNOB - 4] });
  const trackColor = slide.interpolate({ inputRange: [0, 1], outputRange: ['#D5D7DC', GuardColors.green] });

  return (
    <View style={[styles.card, on ? styles.cardOn : styles.cardOff]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: on ? GuardColors.greenBg : '#ECECEE' }]}>
          <Ionicons name={on ? 'shield-checkmark' : 'moon'} size={26} color={on ? GuardColors.green : GuardColors.t2} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.hint} numberOfLines={2}>{hint}</Text>
        </View>
        <Pressable
          testID="duty-toggle"
          accessibilityRole="switch"
          accessibilityLabel={title}
          accessibilityState={{ checked: on, busy: !!busy }}
          disabled={busy}
          onPress={onToggle}
          hitSlop={10}
        >
          <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
            <Animated.View style={[styles.knob, { left: knobX }]}>
              {busy ? <ActivityIndicator size="small" color={GuardColors.t2} /> : null}
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
      {gateLine ? (
        <View style={[styles.gateRow, gateOk ? styles.gateOk : styles.gateBad]}>
          <Ionicons name={gateOk ? 'location' : 'location-outline'} size={16} color={gateOk ? GuardColors.green : GuardColors.red} />
          <Text style={[styles.gateText, { color: gateOk ? GuardColors.green : GuardColors.red }]} numberOfLines={2}>{gateLine}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, padding: 16, backgroundColor: '#FFFFFF', borderWidth: 2, gap: 12 },
  cardOn: { borderColor: GuardColors.green },
  cardOff: { borderColor: GuardColors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22 },
  hint: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 14, marginTop: 2 },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, justifyContent: 'center' },
  knob: { position: 'absolute', width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  gateOk: { backgroundColor: GuardColors.greenBg },
  gateBad: { backgroundColor: GuardColors.redBg },
  gateText: { flex: 1, fontFamily: GuardFonts.bold, fontSize: 14 },
});
