import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '../../../../components/ui/AppAlert';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';
import api from '../../../../services/api';
import { useAuthStore } from '../../../../store/useAuthStore';

// ─── Amenity theme (consistent with index + detail screens) ────────────────────
const AMENITY_THEMES: { keywords: string[]; icon: string; bg: string; color: string }[] = [
  { keywords: ['swim', 'pool'], icon: 'pool', bg: '#DBEEFF', color: '#1A7FD4' },
  { keywords: ['gym', 'fitness', 'workout'], icon: 'dumbbell', bg: '#FFE8E8', color: '#D94040' },
  { keywords: ['club', 'hall', 'lounge', 'party'], icon: 'glass-cocktail', bg: SgateColors.goldPale, color: SgateColors.goldDeep },
  { keywords: ['badminton', 'tennis', 'squash'], icon: 'tennis', bg: '#E8FFE8', color: '#2E9E4F' },
  { keywords: ['basket', 'cricket', 'football'], icon: 'basketball', bg: '#FFF0DB', color: '#E07B00' },
  { keywords: ['kids', 'play', 'children'], icon: 'human-child', bg: '#FFF8DB', color: '#D4A000' },
  { keywords: ['garden', 'terrace', 'park', 'lawn'], icon: 'pine-tree', bg: '#E8FFE8', color: '#2E9E4F' },
  { keywords: ['yoga', 'meditation', 'aerobic'], icon: 'yoga', bg: '#EDE9FE', color: '#7C3AED' },
  { keywords: ['library', 'reading', 'study'], icon: 'book-open-page-variant', bg: '#EDE9FE', color: '#5B21B6' },
  { keywords: ['parking', 'car', 'vehicle'], icon: 'car', bg: '#F0F0F0', color: '#555555' },
];

function resolveTheme(name: string) {
  const lower = name.toLowerCase();
  const match = AMENITY_THEMES.find(t => t.keywords.some(k => lower.includes(k)));
  return match ?? { icon: 'home', bg: SgateColors.goldPale, color: SgateColors.goldDeep };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

function formatReadableDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_NAMES[d.getDay()]}, ${day} ${MONTH_NAMES[d.getMonth()]} ${year}`;
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function BookAmenityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { id, slotId, slotTime, date, amenityName, maxCapacity, rules: rulesParam } =
    useLocalSearchParams<{
      id: string; slotId: string; slotTime: string; date: string;
      amenityName: string; maxCapacity: string; rules: string;
    }>();

  const [purpose, setPurpose] = useState('');
  const [purposeFocused, setPurposeFocused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;

  const name = amenityName ?? '';
  const theme = resolveTheme(name);
  const capacity = parseInt(maxCapacity ?? '1', 10) || 1;
  const rules: string[] = (() => { try { return JSON.parse(rulesParam ?? '[]'); } catch { return []; } })();
  const flatLabel = user?.flat ? `${user.flat.block?.name ? user.flat.block.name + ' ' : ''}${user.flat.number}` : '—';
  const readableDate = date ? formatReadableDate(date) : '';

  const handleConfirm = async () => {
    if (submitting) return;

    // Press animation
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.98, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setSubmitting(true);
    try {
      await api.post(`/resident/amenities/${id}/book`, {
        slotId,
        date,
        ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
      });
      AppAlert.show(
        'Booking Confirmed!',
        'Your slot has been booked.',
        [{ text: 'OK', onPress: () => router.push('/(resident)/amenities' as any) }],
      );
    } catch (err: any) {
      AppAlert.show('Failed', err?.response?.data?.message ?? 'Could not confirm booking. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.headerContainer}>
        <SafeAreaView edges={['top']}>
          <View style={S.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Confirm Booking</Text>
            <View style={S.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Persistent spacer — content never touches header */}
      <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scrollContent}>
        {/* ─── Summary Card ─────────────────────────────────────────── */}
        <View style={S.summaryCard}>
          <Text style={S.summaryCardLabel}>Booking Summary</Text>

          {/* Amenity identity row */}
          <View style={S.amenityRow}>
            <View style={[S.amenityIconBubble, { backgroundColor: theme.bg }]}>
              <MaterialCommunityIcons name={theme.icon as any} size={24} color={theme.color} />
            </View>
            <Text style={S.amenityName}>{name}</Text>
          </View>

          <View style={S.summaryDivider} />

          {/* Stacked detail rows */}
          <View style={S.detailStack}>
            <View style={S.detailItem}>
              <View style={S.detailLabelRow}>
                <Feather name="calendar" size={13} color="#888888" />
                <Text style={S.detailLabel}>Date</Text>
              </View>
              <Text style={S.detailValue}>{readableDate}</Text>
            </View>

            <View style={S.detailItem}>
              <View style={S.detailLabelRow}>
                <Feather name="clock" size={13} color="#888888" />
                <Text style={S.detailLabel}>Time</Text>
              </View>
              <Text style={S.detailValue}>{slotTime}</Text>
            </View>

            <View style={S.detailItem}>
              <View style={S.detailLabelRow}>
                <Feather name="home" size={13} color="#888888" />
                <Text style={S.detailLabel}>Flat</Text>
              </View>
              <Text style={S.detailValue}>{flatLabel}</Text>
            </View>
          </View>
        </View>

        {/* ─── Purpose Input ────────────────────────────────────────── */}
        <View style={S.purposeCard}>
          <Text style={S.purposeLabel}>
            Purpose <Text style={S.purposeOptional}>(optional)</Text>
          </Text>
          <TextInput
            style={[
              S.purposeInput,
              purposeFocused && S.purposeInputFocused,
            ]}
            placeholder="e.g. Morning workout, Family swim…"
            placeholderTextColor="#999999"
            value={purpose}
            onChangeText={setPurpose}
            onFocus={() => setPurposeFocused(true)}
            onBlur={() => setPurposeFocused(false)}
            maxLength={100}
            returnKeyType="done"
          />
        </View>

        {/* ─── Rules Card ───────────────────────────────────────────── */}
        {rules.length > 0 && (
          <View style={S.rulesCard}>
            <TouchableOpacity activeOpacity={0.7} style={S.rulesToggleRow} onPress={() => setShowRules(v => !v)}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color={SgateColors.goldDeep} />
              <Text style={S.rulesToggleLabel}>Rules & Guidelines</Text>
              <View style={{ flex: 1 }} />
              <Feather name={showRules ? 'chevron-up' : 'chevron-down'} size={18} color={SgateColors.t3} />
            </TouchableOpacity>
            {showRules && rules.map((rule, idx) => (
              <View key={idx} style={S.ruleRow}>
                <View style={S.ruleDot} />
                <Text style={S.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── Info Note ────────────────────────────────────────────── */}
        <View style={S.noteCard}>
          <Feather name="info" size={15} color="#8A6D00" style={{ marginTop: 1 }} />
          <Text style={S.noteText}>
            Cancellations must be made at least 2 hours before the slot.
          </Text>
        </View>

        {/* ─── Confirm Button ───────────────────────────────────────── */}
        <Animated.View style={[S.buttonContainer, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={S.confirmButton}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={SgateColors.black} />
              : <Text style={S.confirmButtonText}>Confirm Booking</Text>
            }
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Header
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
  header: {
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
  headerSpacer: { width: 22 },

  // Summary Card
  summaryCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.semibold,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  // Amenity identity
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  amenityIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityName: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },

  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 16,
  },

  // Stacked details
  detailStack: {
    gap: 16,
  },
  detailItem: {
    gap: 4,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: '#888888',
  },
  detailValue: {
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: '#111111',
    marginLeft: 19, // align with text after the icon (13 icon + 6 gap)
  },

  // Purpose Card
  purposeCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  purposeLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  purposeOptional: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: '#999999',
  },
  purposeInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  purposeInputFocused: {
    borderColor: SgateColors.gold,
    backgroundColor: '#FFFEF5',
  },

  // Rules Card
  rulesCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rulesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rulesToggleLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  ruleRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SgateColors.gold,
    marginTop: 7,
  },
  ruleText: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: '#555555',
    flex: 1,
    lineHeight: 20,
  },

  // Info Note
  noteCard: {
    backgroundColor: '#FFF6D6',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: '#8A6D00',
    flex: 1,
    lineHeight: 19,
  },

  // Confirm Button
  buttonContainer: {
    marginTop: 28,
  },
  confirmButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: SgateColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SgateColors.goldDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: '#111111',
  },
});
