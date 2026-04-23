import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

const AMENITY_THEMES: { keywords: string[]; icon: string; colorBg: string; colorIcon: string }[] = [
  { keywords: ['swim', 'pool'],                     icon: 'pool',               colorBg: '#DBEEFF', colorIcon: '#1A7FD4' },
  { keywords: ['gym', 'fitness', 'workout'],        icon: 'dumbbell',           colorBg: '#FFE8E8', colorIcon: '#D94040' },
  { keywords: ['club', 'hall', 'lounge', 'party'],  icon: 'glass-cocktail',     colorBg: SgateColors.goldPale, colorIcon: SgateColors.goldDeep },
  { keywords: ['badminton', 'tennis', 'squash'],    icon: 'tennis',             colorBg: '#E8FFE8', colorIcon: '#2E9E4F' },
  { keywords: ['basket', 'cricket', 'football'],    icon: 'basketball',         colorBg: '#FFF0DB', colorIcon: '#E07B00' },
  { keywords: ['kids', 'play', 'children'],         icon: 'human-child',        colorBg: '#FFF8DB', colorIcon: '#D4A000' },
  { keywords: ['garden', 'terrace', 'park', 'lawn'],icon: 'pine-tree',          colorBg: '#E8FFE8', colorIcon: '#2E9E4F' },
  { keywords: ['yoga', 'meditation', 'aerobic'],    icon: 'yoga',               colorBg: '#EDE9FE', colorIcon: '#7C3AED' },
  { keywords: ['library', 'reading', 'study'],      icon: 'book-open-page-variant', colorBg: '#EDE9FE', colorIcon: '#5B21B6' },
  { keywords: ['parking', 'car', 'vehicle'],        icon: 'car',                colorBg: '#F0F0F0', colorIcon: '#555555' },
];

function resolveTheme(name: string) {
  const lower = name.toLowerCase();
  const match = AMENITY_THEMES.find(t => t.keywords.some(k => lower.includes(k)));
  return match ?? { icon: 'home', colorBg: SgateColors.goldPale, colorIcon: SgateColors.goldDeep };
}

interface TimeSlot { id: string; label: string; startTime: string; endTime: string; status: 'AVAILABLE' | 'BOOKED' | 'PAST'; isBookable: boolean; }
interface Amenity { id: string; name: string; timing: string; maxCapacity: number; slotDurationHours: number; rules: string[]; icon: string; colorBg: string; colorIcon: string; slots: TimeSlot[]; }

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface DateItem {
  date: Date;
  label: string;
  subLabel: string | null;
  key: string;
}

function buildDates(): DateItem[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAY_ABBR[d.getDay()];
    const subLabel = i <= 1 ? null : String(d.getDate());
    const key = d.toISOString().split('T')[0];
    return { date: d, label, subLabel, key };
  });
}

export default function AmenityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [amenity, setAmenity] = useState<Amenity | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const dates = buildDates();

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get(`/resident/amenities/${id}`);
        const raw = res.data?.data ?? res.data;
        const theme = resolveTheme(raw.name ?? '');
        setAmenity({
          id: raw.id, name: raw.name ?? '', timing: raw.timings ?? raw.timing ?? '',
          maxCapacity: raw.maxCapacity ?? 0, slotDurationHours: raw.slotDurationHours ?? 1,
          rules: raw.rules ?? [], slots: [],
          icon: theme.icon, colorBg: theme.colorBg, colorIcon: theme.colorIcon,
        });
      } catch { /* shown below */ } finally { setLoading(false); }
    })();
  }, [id]));

  const handleDateSelect = async (key: string) => {
    setSelectedDate(key);
    setSelectedSlot(null);
    if (!amenity) return;
    setSlotsLoading(true);
    try {
      const res = await api.get(`/resident/amenities/${id}/slots`, { params: { date: key } });
      const rawSlots: any[] = res.data?.data ?? res.data ?? [];
      setAmenity(a => a ? { ...a, slots: rawSlots.map(s => ({
        id: s.id,
        label: s.label ?? `${s.startTime} – ${s.endTime}`,
        startTime: s.startTime,
        endTime: s.endTime,
        status: (s.status ?? 'AVAILABLE') as TimeSlot['status'],
        isBookable: s.isBookable ?? s.status === 'AVAILABLE',
      })) } : a);
    } catch { /* silently fail */ } finally { setSlotsLoading(false); }
  };

  const handleBookSlot = () => {
    if (!selectedSlot || !selectedDate || !amenity) return;
    router.push({ pathname: '/(resident)/amenities/book/[id]' as any, params: {
      id: amenity.id,
      slotId: selectedSlot.id,
      slotTime: selectedSlot.label,
      date: selectedDate,
      amenityName: amenity.name,
      maxCapacity: String(amenity.maxCapacity),
      rules: JSON.stringify(amenity.rules),
    }});
  };

  if (loading) return (
    <SafeAreaView edges={['top', 'bottom']} style={S.root}>
      <View style={[S.notFound]}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
    </SafeAreaView>
  );

  if (!amenity) return (
    <SafeAreaView edges={['top', 'bottom']} style={S.root}>
      <View style={S.notFound}><Text style={S.notFoundText}>Amenity not found</Text></View>
    </SafeAreaView>
  );

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={{ backgroundColor: SgateColors.card }}>
        <SafeAreaView edges={['top']}>
          <View style={S.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle} numberOfLines={1}>
              Details
            </Text>
            <View style={S.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scrollContent}
      >
        {/* Premium Profile Header */}
        <View style={S.profileHeader}>
          <View style={[S.avatarCircle, { backgroundColor: amenity.colorBg }]}>
            <MaterialCommunityIcons
              name={amenity.icon as any}
              size={48}
              color={amenity.colorIcon}
            />
          </View>
          <Text style={S.profileName}>{amenity.name}</Text>
          <Text style={S.profileSubText}>{amenity.timing}</Text>
        </View>

        {/* Info card */}
        <View style={S.infoCard}>
          <View style={S.infoRow}>
            <Feather name="clock" size={16} color={SgateColors.t3} />
            <Text style={S.infoText}>{amenity.timing}</Text>
          </View>
          <View style={[S.infoRow, { marginTop: 10 }]}>
            <Feather name="users" size={16} color={SgateColors.t3} />
            <Text style={S.infoText}>
              Max {amenity.maxCapacity} persons per slot
            </Text>
          </View>
          <View style={[S.infoRow, { marginTop: 10 }]}>
            <Feather name="clock" size={16} color={SgateColors.t3} />
            <Text style={S.infoText}>
              {amenity.slotDurationHours} hour per slot
            </Text>
          </View>

          <View style={S.divider} />

          {/* Rules */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={S.rulesToggleRow}
            onPress={() => setShowRules((v) => !v)}
          >
            <Text style={S.rulesToggleLabel}>Rules & Guidelines</Text>
            <View style={{ flex: 1 }} />
            <Feather
              name={showRules ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={SgateColors.t2}
            />
          </TouchableOpacity>

          {showRules &&
            amenity.rules.map((rule, idx) => (
              <View key={idx} style={S.ruleRow}>
                <View style={S.ruleDot} />
                <Text style={S.ruleText}>{rule}</Text>
              </View>
            ))}
        </View>

        {/* Available Slots */}
        <View style={S.slotsSection}>
          <Text style={S.slotsSectionTitle}>Available Slots</Text>

          {/* Date chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.dateChipsContent}
          >
            {dates.map((item) => {
              const isSelected = selectedDate === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.75}
                  style={[
                    S.dateChip,
                    isSelected ? S.dateChipSelected : S.dateChipDefault,
                  ]}
                  onPress={() => handleDateSelect(item.key)}
                >
                  <Text
                    style={[
                      S.dateChipLabel,
                      { color: isSelected ? SgateColors.card : SgateColors.t2 },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.subLabel !== null && (
                    <Text
                      style={[
                        S.dateChipSubLabel,
                        { color: isSelected ? SgateColors.card : SgateColors.t1 },
                      ]}
                    >
                      {item.subLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Slot grid */}
          {selectedDate ? (
            <View style={S.slotGrid}>
              {amenity.slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const chipStyle =
                  slot.status === 'BOOKED' ? S.slotChipBooked
                  : slot.status === 'PAST'  ? S.slotChipPast
                  : isSelected              ? S.slotChipSelected
                  :                           S.slotChipAvailable;
                const textStyle =
                  slot.status === 'BOOKED' ? S.slotTimeBooked
                  : slot.status === 'PAST'  ? S.slotTimePast
                  : isSelected              ? S.slotTimeSelected
                  :                           S.slotTimeDefault;

                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={!slot.isBookable}
                    activeOpacity={0.75}
                    style={[S.slotChip, chipStyle]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={textStyle}>{slot.label}</Text>
                    {slot.status === 'BOOKED' && (
                      <Text style={S.slotStatusLabel}>Booked</Text>
                    )}
                    {slot.status === 'PAST' && (
                      <Text style={S.slotStatusLabel}>Past</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={S.selectDateHint}>
              Select a date to see available slots
            </Text>
          )}
        </View>

        {/* Book button — inside scroll, bottom spacer handled by SafeAreaView bottom */}
        <View style={S.bookButtonContainer}>
          <TouchableOpacity
            activeOpacity={selectedSlot ? 0.8 : 1}
            disabled={!selectedSlot}
            style={[
              S.bookButton,
              {
                backgroundColor: selectedSlot
                  ? SgateColors.gold
                  : SgateColors.surface,
              },
            ]}
            onPress={handleBookSlot}
          >
            <Text
              style={[
                S.bookButtonText,
                {
                  color: selectedSlot ? SgateColors.black : SgateColors.t3,
                },
              ]}
            >
              Book Slot
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  headerSpacer: {
    width: 22,
  },

  // Premium Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 16,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  profileName: {
    fontSize: 26,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
    marginBottom: 4,
  },
  profileSubText: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
    letterSpacing: 0.5,
  },

  // Info card
  infoCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
  },
  divider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: SgateColors.borderSoft,
  },

  // Rules
  rulesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rulesToggleLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  ruleRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SgateColors.goldDeep,
    marginTop: 6,
  },
  ruleText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    flex: 1,
  },

  // Slots section
  slotsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  slotsSectionTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginBottom: 12,
  },

  // Date chips
  dateChipsContent: {
    gap: 10,
    paddingBottom: 16,
    paddingHorizontal: 2, // avoid clipping subtle shadow
  },
  dateChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 56,
  },
  dateChipSelected: {
    backgroundColor: SgateColors.black,
    borderColor: SgateColors.black,
  },
  dateChipDefault: {
    backgroundColor: SgateColors.card,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  dateChipLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
  },
  dateChipSubLabel: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    marginTop: 4,
  },

  // Slot grid
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotChip: {
    borderRadius: 100, // Modern pill shape
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  // AVAILABLE — app yellow tint
  slotChipAvailable: {
    backgroundColor: SgateColors.goldPale,
    borderColor: 'transparent',
  },
  // BOOKED & PAST — greyed out
  slotChipBooked: {
    backgroundColor: SgateColors.surface,
    borderColor: 'transparent',
    opacity: 0.8,
  },
  slotChipPast: {
    backgroundColor: SgateColors.surface,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  // SELECTED — solid gold
  slotChipSelected: {
    backgroundColor: SgateColors.gold,
    borderColor: SgateColors.gold,
    shadowColor: SgateColors.goldDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  slotTimeDefault: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.goldDeep,
  },
  slotTimeBooked: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t4,
    textDecorationLine: 'line-through', // Extra clear it's booked
  },
  slotTimePast: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t4,
  },
  slotTimeSelected: {
    fontSize: 13,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },
  slotStatusLabel: {
    display: 'none', // Removed the extra "Booked" text since line-through handles it much more elegantly in a pill
  },

  // Hint
  selectDateHint: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Book button
  bookButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  bookButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
  },
});
