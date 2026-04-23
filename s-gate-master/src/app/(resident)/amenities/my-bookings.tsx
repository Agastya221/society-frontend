import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedRN, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ─────────────────────────────────────────────────────────────────────
type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
interface MyBooking {
  id: string; amenityName: string;
  date: string; timeSlot: string; members: number; status: BookingStatus;
  iconName: string; iconColor: string; iconBg: string;
}

// ─── Amenity Theme Mapping (same as index screen) ──────────────────────────────
const AMENITY_THEMES: { keywords: string[]; icon: string; bg: string; color: string }[] = [
  { keywords: ['swim', 'pool'],                    icon: 'pool',               bg: '#DBEEFF', color: '#1A7FD4' },
  { keywords: ['gym', 'fitness', 'workout'],       icon: 'dumbbell',           bg: '#FFE8E8', color: '#D94040' },
  { keywords: ['club', 'hall', 'lounge', 'party'], icon: 'glass-cocktail',     bg: SgateColors.goldPale, color: SgateColors.goldDeep },
  { keywords: ['badminton', 'tennis', 'squash'],   icon: 'tennis',             bg: '#E8FFE8', color: '#2E9E4F' },
  { keywords: ['basket', 'cricket', 'football'],   icon: 'basketball',         bg: '#FFF0DB', color: '#E07B00' },
  { keywords: ['kids', 'play', 'children'],        icon: 'human-child',        bg: '#FFF8DB', color: '#D4A000' },
  { keywords: ['garden', 'terrace', 'park', 'lawn'], icon: 'pine-tree',        bg: '#E8FFE8', color: '#2E9E4F' },
  { keywords: ['yoga', 'meditation', 'aerobic'],   icon: 'yoga',               bg: '#EDE9FE', color: '#7C3AED' },
  { keywords: ['library', 'reading', 'study'],     icon: 'book-open-page-variant', bg: '#EDE9FE', color: '#5B21B6' },
  { keywords: ['parking', 'car', 'vehicle'],       icon: 'car',                bg: '#F0F0F0', color: '#555555' },
  { keywords: ['sport', 'court'],                  icon: 'basketball',         bg: '#FFF0DB', color: '#E07B00' },
];

function resolveAmenityTheme(name: string) {
  const lower = name.toLowerCase();
  const match = AMENITY_THEMES.find(t => t.keywords.some(k => lower.includes(k)));
  return match ?? { icon: 'home', bg: SgateColors.goldPale, color: SgateColors.goldDeep };
}

// ─── Normalise API response ────────────────────────────────────────────────────
function normalise(raw: any): MyBooking {
  const rawDate = raw.date ?? raw.bookingDate ?? raw.slotDate ?? '';
  const date = rawDate.split('T')[0];

  const slot = raw.slot ?? {};
  const timeSlot =
    raw.timeSlot ??
    slot.label ??
    slot.time ??
    (slot.startTime ? `${slot.startTime}${slot.endTime ? ` – ${slot.endTime}` : ''}` : null) ??
    (raw.startTime ? `${raw.startTime}${raw.endTime ? ` – ${raw.endTime}` : ''}` : null) ??
    '';

  const amenityName = raw.amenity?.name ?? raw.amenityName ?? '';
  const theme = resolveAmenityTheme(amenityName);

  return {
    id:          raw.id,
    amenityName,
    date,
    timeSlot,
    members:     raw.membersCount ?? raw.members ?? 1,
    status:      (raw.status?.toUpperCase() ?? 'CONFIRMED') as BookingStatus,
    iconName:    theme.icon,
    iconColor:   theme.color,
    iconBg:      theme.bg,
  };
}

type Tab = 'UPCOMING' | 'PAST';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const config =
    status === 'CONFIRMED'  ? { bg: '#E6F7EF', color: '#1BA97F', label: 'Confirmed' }
    : status === 'CANCELLED' ? { bg: '#FFECEC', color: '#E53935', label: 'Cancelled' }
    :                          { bg: '#F3F4F6', color: '#6B7280', label: 'Completed' };

  return (
    <View style={[S.badge, { backgroundColor: config.bg }]}>
      <Text style={[S.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Booking Card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, index, onCancel }: { booking: MyBooking; index: number; onCancel: (id: string) => void }) {
  const cancelScale = useRef(new Animated.Value(1)).current;

  const handleCancelPress = () => {
    // Animate the button
    Animated.sequence([
      Animated.timing(cancelScale, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(cancelScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    AppAlert.show(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep It', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => onCancel(booking.id) },
      ],
    );
  };

  return (
    <AnimatedRN.View entering={FadeInDown.delay(index * 70).springify()}>
      <View style={S.card}>
        {/* Top row: Icon + Title + Status */}
        <View style={S.cardTopRow}>
          <View style={[S.iconBubble, { backgroundColor: booking.iconBg }]}>
            <MaterialCommunityIcons name={booking.iconName as any} size={22} color={booking.iconColor} />
          </View>
          <Text style={S.cardTitle} numberOfLines={1}>{booking.amenityName}</Text>
          <StatusBadge status={booking.status} />
        </View>

        {/* Divider */}
        <View style={S.cardDivider} />

        {/* Detail rows */}
        <View style={S.detailsBlock}>
          <View style={S.detailRow}>
            <Feather name="calendar" size={14} color="#9CA3AF" />
            <Text style={S.detailText}>{formatDate(booking.date)}</Text>
          </View>
          <View style={S.detailRow}>
            <Feather name="clock" size={14} color="#9CA3AF" />
            <Text style={S.detailText}>{booking.timeSlot}</Text>
          </View>
          <View style={S.detailRow}>
            <Feather name="users" size={14} color="#9CA3AF" />
            <Text style={S.detailText}>
              {booking.members} member{booking.members > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Cancel action — only for CONFIRMED */}
        {booking.status === 'CONFIRMED' && (
          <Animated.View style={{ transform: [{ scale: cancelScale }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCancelPress}
              style={S.cancelButton}
            >
              <Feather name="x-circle" size={14} color="#E53935" />
              <Text style={S.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </AnimatedRN.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function MyBookingsScreen() {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('UPCOMING');
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading]   = useState(true);

  // Animated tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    Animated.spring(tabAnim, {
      toValue: newTab === 'UPCOMING' ? 0 : 1,
      useNativeDriver: false,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get('/resident/amenities/my-bookings');
        const data = res.data?.data ?? res.data;
        const list: any[] = Array.isArray(data) ? data : (data?.bookings ?? data?.items ?? []);
        setBookings(list.map(normalise));
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally { setLoading(false); }
    })();
  }, []));

  const filtered = tab === 'UPCOMING'
    ? bookings.filter(b => b.status === 'CONFIRMED')
    : bookings.filter(b => b.status !== 'CONFIRMED');

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/resident/amenities/bookings/${id}/cancel`, { reason: 'Plans changed' });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b));
    } catch {
      AppAlert.show('Error', 'Could not cancel booking. Please try again.');
    }
  };

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
            <Text style={S.headerTitle}>My Bookings</Text>
            <View style={S.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Tab Switcher */}
      <View style={S.tabContainer}>
        <View style={S.tabPill}>
          {/* Animated indicator */}
          <Animated.View
            style={[
              S.tabIndicator,
              {
                left: tabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2%', '50%'],
                }),
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            style={S.tabBtn}
            onPress={() => switchTab('UPCOMING')}
          >
            <Text style={[S.tabBtnText, tab === 'UPCOMING' && S.tabBtnTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={S.tabBtn}
            onPress={() => switchTab('PAST')}
          >
            <Text style={[S.tabBtnText, tab === 'PAST' && S.tabBtnTextActive]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={S.loadingContainer}>
          <ActivityIndicator size="large" color={SgateColors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filtered.length === 0 ? S.emptyContainer : S.listContent
          }
          renderItem={({ item, index }) => (
            <BookingCard booking={item} index={index} onCancel={handleCancel} />
          )}
          ListEmptyComponent={
            <View style={S.emptyInner}>
              <View style={S.emptyIconCircle}>
                <Feather name="calendar" size={32} color={SgateColors.goldDeep} />
              </View>
              <Text style={S.emptyTitle}>No bookings yet</Text>
              <Text style={S.emptySubtitle}>
                {tab === 'UPCOMING'
                  ? 'Your upcoming bookings will appear here'
                  : 'Past bookings will be shown here'}
              </Text>
              {tab === 'UPCOMING' && (
                <TouchableOpacity
                  style={S.emptyCta}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(resident)/amenities' as any)}
                >
                  <Text style={S.emptyCtaText}>Browse Amenities</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Header
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

  // Tab Switcher
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    width: '48%',
    height: '100%',
    backgroundColor: SgateColors.gold,
    borderRadius: 14,
    top: 4,
    shadowColor: SgateColors.goldDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  tabBtnText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: '#777777',
  },
  tabBtnTextActive: {
    color: '#111111',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
  },

  // Empty State
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyCta: {
    marginTop: 12,
    backgroundColor: SgateColors.gold,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 100,
  },
  emptyCtaText: {
    fontSize: 14,
    fontFamily: SgateFonts.bold,
    color: '#111111',
  },

  // Booking Card
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },

  // Status Badge
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: SgateFonts.semibold,
  },

  // Divider
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 14,
  },

  // Detail rows
  detailsBlock: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: '#555555',
  },

  // Cancel Button
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#FFECEC',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: '#E53935',
  },
});
