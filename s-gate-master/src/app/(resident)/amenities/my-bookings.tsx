import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'PENDING';
interface MyBooking {
  id: string; amenityName: string; amenityIcon: string;
  date: string; timeSlot: string; members: number; status: BookingStatus;
}

function normalise(raw: any): MyBooking {
  return {
    id:           raw.id,
    amenityName:  raw.amenity?.name ?? raw.amenityName ?? '',
    amenityIcon:  raw.amenity?.icon ?? raw.amenityIcon ?? 'home',
    date:         raw.date ?? raw.bookingDate ?? '',
    timeSlot:     raw.timeSlot ?? raw.slot?.time ?? '',
    members:      raw.membersCount ?? raw.members ?? 1,
    status:       raw.status ?? 'CONFIRMED',
  };
}

type Tab = 'UPCOMING' | 'PAST';

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function formatDate(dateStr: string): string {
  // '2026-03-25' → '25 Mar 2026'
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  let bg: string = SgateColors.surface;
  let color: string = SgateColors.t3;
  let label = 'Completed';

  if (status === 'CONFIRMED') {
    bg = SgateColors.greenBg;
    color = SgateColors.green;
    label = 'Confirmed';
  } else if (status === 'CANCELLED') {
    bg = SgateColors.redBg;
    color = SgateColors.red;
    label = 'Cancelled';
  }

  return (
    <View style={[S.badge, { backgroundColor: bg }]}>
      <Text style={[S.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function BookingCard({
  booking,
  index,
  onCancel,
}: {
  booking: MyBooking;
  index: number;
  onCancel: (id: string) => void;
}) {
  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => onCancel(booking.id),
        },
      ],
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View style={S.card}>
        {/* Top row */}
        <View style={S.cardTopRow}>
          <View style={S.iconBubble}>
            <Feather
              name={booking.amenityIcon as any}
              size={18}
              color={SgateColors.t2}
            />
          </View>
          <Text style={S.cardTitle}>{booking.amenityName}</Text>
          <StatusBadge status={booking.status} />
        </View>

        {/* Detail rows */}
        <View style={S.detailsBlock}>
          <View style={S.detailRow}>
            <Feather name="calendar" size={13} color={SgateColors.t3} />
            <Text style={S.detailText}>{formatDate(booking.date)}</Text>
          </View>
          <View style={S.detailRow}>
            <Feather name="clock" size={13} color={SgateColors.t3} />
            <Text style={S.detailText}>{booking.timeSlot}</Text>
          </View>
          <View style={S.detailRow}>
            <Feather name="users" size={13} color={SgateColors.t3} />
            <Text style={S.detailText}>
              {booking.members} member{booking.members > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Cancel action — only for CONFIRMED */}
        {booking.status === 'CONFIRMED' && (
          <View style={S.cancelRow}>
            <TouchableOpacity activeOpacity={0.75} onPress={handleCancel}>
              <Text style={S.cancelText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('UPCOMING');
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get('/resident/amenities/my-bookings');
        const list: any[] = res.data?.data ?? res.data ?? [];
        setBookings((Array.isArray(list) ? list : []).map(normalise));
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally { setLoading(false); }
    })();
  }, []));

  const filtered = tab === 'UPCOMING'
    ? bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
    : bookings.filter(b => b.status !== 'CONFIRMED' && b.status !== 'PENDING');

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'Keep It', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/resident/amenities/bookings/${id}`);
          setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b));
        } catch {
          Alert.alert('Error', 'Could not cancel booking. Please try again.');
        }
      }},
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={S.root}>
      {/* Header */}
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

      {/* Tab switcher */}
      <View style={S.tabContainer}>
        <View style={S.tabPill}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[S.tabBtn, tab === 'UPCOMING' && S.tabBtnActive]}
            onPress={() => setTab('UPCOMING')}
          >
            <Text
              style={[
                S.tabBtnText,
                tab === 'UPCOMING' && S.tabBtnTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[S.tabBtn, tab === 'PAST' && S.tabBtnActive]}
            onPress={() => setTab('PAST')}
          >
            <Text
              style={[S.tabBtnText, tab === 'PAST' && S.tabBtnTextActive]}
            >
              Past
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
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
            <Feather name="bookmark" size={40} color={SgateColors.t4} />
            <Text style={S.emptyTitle}>No bookings</Text>
            <Text style={S.emptySubtitle}>
              {tab === 'UPCOMING'
                ? 'You have no upcoming bookings.'
                : 'No past bookings to show.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Header
  header: {
    backgroundColor: SgateColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },
  headerSpacer: {
    width: 22,
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: SgateColors.surface,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: SgateColors.black,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t3,
  },
  tabBtnTextActive: {
    color: SgateColors.card,
  },

  // List
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
  },

  // Empty state
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Booking card
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SgateColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 10,
  },

  // Status badge
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
  },

  // Detail rows
  detailsBlock: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
  },

  // Cancel row
  cancelRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.red,
  },
});
