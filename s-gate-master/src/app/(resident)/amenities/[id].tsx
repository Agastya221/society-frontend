import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Animated, Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScreenLayout } from '../../../components/ui/AppScreenLayout';
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
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // Always use 3-letter day abbreviation for consistent pill width
    const label = WEEKDAY_ABBR[d.getDay()];
    const subLabel = String(d.getDate());
    const key = d.toISOString().split('T')[0];
    return { date: d, label, subLabel, key };
  });
}

// ─── Premium Calendar Strip Item ───────────────────────────────────────────────
function DateStripItem({ item, isSelected, onPress }: { item: DateItem; isSelected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const circleScale = useRef(new Animated.Value(isSelected ? 1 : 0.7)).current;
  const circleOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(circleScale, {
        toValue: isSelected ? 1 : 0.7,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.timing(circleOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[S.dateStripItem, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={S.dateStripBtn}
      >
        {/* Day label */}
        <Text style={[S.dateStripDay, isSelected && S.dateStripDaySelected]}>
          {item.label}
        </Text>

        {/* Circular highlight + date number */}
        <View style={S.dateStripCircleWrap}>
          <Animated.View
            style={[
              S.dateStripCircle,
              { transform: [{ scale: circleScale }], opacity: circleOpacity },
            ]}
          />
          <Text style={[S.dateStripDate, isSelected && S.dateStripDateSelected]}>
            {item.subLabel}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
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
  const [showCalendar, setShowCalendar] = useState(false);
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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: SgateColors.bg }}>
      <View style={S.notFound}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
    </SafeAreaView>
  );

  if (!amenity) return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: SgateColors.bg }}>
      <View style={S.notFound}><Text style={S.notFoundText}>Amenity not found</Text></View>
    </SafeAreaView>
  );

  return (
    <AppScreenLayout title="Details">
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

          {/* Calendar Date Picker */}
          <TouchableOpacity
            style={S.calendarTrigger}
            activeOpacity={0.75}
            onPress={() => setShowCalendar(true)}
          >
            <Feather name="calendar" size={16} color={SgateColors.goldDeep} />
            <Text style={S.calendarTriggerText}>
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
                : 'Select a date'}
            </Text>
            <Feather name="chevron-down" size={16} color={SgateColors.t3} />
          </TouchableOpacity>

          {/* Calendar Modal */}
          <Modal
            visible={showCalendar}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCalendar(false)}
          >
            <TouchableOpacity
              style={S.calendarOverlay}
              activeOpacity={1}
              onPress={() => setShowCalendar(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={S.calendarSheet}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Sheet Handle */}
                <View style={S.calendarHandle} />
                <Text style={S.calendarSheetTitle}>Select a Date</Text>

                <Calendar
                  minDate={new Date().toISOString().split('T')[0]}
                  maxDate={(() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()}
                  onDayPress={(day) => {
                    handleDateSelect(day.dateString);
                    setShowCalendar(false);
                  }}
                  markedDates={selectedDate ? {
                    [selectedDate]: {
                      selected: true,
                      selectedColor: SgateColors.gold,
                      selectedTextColor: '#111111',
                    },
                  } : {}}
                  theme={{
                    backgroundColor: 'transparent',
                    calendarBackground: 'transparent',
                    selectedDayBackgroundColor: SgateColors.gold,
                    selectedDayTextColor: '#111111',
                    todayTextColor: SgateColors.goldDeep,
                    dayTextColor: SgateColors.t1,
                    textDisabledColor: '#D1D5DB',
                    arrowColor: SgateColors.goldDeep,
                    monthTextColor: SgateColors.t1,
                    textDayFontFamily: SgateFonts.medium,
                    textMonthFontFamily: SgateFonts.bold,
                    textDayHeaderFontFamily: SgateFonts.semibold,
                    textDayFontSize: 15,
                    textMonthFontSize: 17,
                    textDayHeaderFontSize: 12,
                    dotColor: SgateColors.gold,
                    'stylesheet.calendar.header': {
                      header: {
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 8,
                        paddingVertical: 12,
                      },
                    },
                  }}
                />

                <TouchableOpacity
                  style={S.calendarDismiss}
                  onPress={() => setShowCalendar(false)}
                >
                  <Text style={S.calendarDismissText}>Cancel</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

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
    </AppScreenLayout>
  );
}

const S = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SgateColors.bg,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  scrollContent: {
    paddingBottom: 32,
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

  // Calendar trigger button
  calendarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SgateColors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SgateColors.goldPale,
    shadowColor: SgateColors.goldDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  calendarTriggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },

  // Calendar Modal
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  calendarSheet: {
    backgroundColor: SgateColors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
    paddingTop: 12,
  },
  calendarHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 16,
  },
  calendarSheetTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  calendarDismiss: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: SgateColors.surface,
    alignItems: 'center',
  },
  calendarDismissText: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },

  // Calendar Strip
  dateStripOuter: {
    backgroundColor: SgateColors.goldPale, // subtle warm strip across entire row
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dateStripRow: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 0, // items sit flush together — strip feel
  },
  dateStripItem: {
    // No background here — circle handles the highlight
  },
  dateStripBtn: {
    width: 52,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateStripDay: {
    fontSize: 11,
    fontFamily: SgateFonts.medium,
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateStripDaySelected: {
    color: SgateColors.goldDeep,
    fontFamily: SgateFonts.semibold,
  },
  dateStripCircleWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStripCircle: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SgateColors.gold,
  },
  dateStripDate: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    // sits on top of the absolutely positioned circle
  },
  dateStripDateSelected: {
    color: '#111111',
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
