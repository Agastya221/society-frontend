import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { AppScreenLayout } from '../../../components/ui/AppScreenLayout';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

interface Amenity {
  id: string; name: string; timing: string; maxCapacity: number;
  icon: string; colorBg: string; colorIcon: string;
  slotDurationHours?: number; rules?: string[];
}

// ─── Auto icon + color from amenity name ─────────────────────────────────────
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

function normalise(raw: any): Amenity {
  const theme = resolveTheme(raw.name ?? '');
  return {
    id:                raw.id,
    name:              raw.name ?? '',
    timing:            raw.timings ?? raw.timing ?? '',
    maxCapacity:       raw.maxCapacity ?? raw.capacity ?? 0,
    slotDurationHours: raw.slotDurationHours ?? 1,
    rules:             raw.rules ?? [],
    icon:      theme.icon,
    colorBg:   theme.colorBg,
    colorIcon: theme.colorIcon,
  };
}

function AmenityCard({ item, index }: { item: Amenity; index: number }) {
  const router = useRouter();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={S.cardWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={S.card}
        onPress={() => router.push(`/(resident)/amenities/${item.id}` as any)}
      >
        <View style={[S.iconBubble, { backgroundColor: item.colorBg }]}>
          <MaterialCommunityIcons name={item.icon as any} size={26} color={item.colorIcon} />
        </View>

        <Text style={S.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={S.cardTiming} numberOfLines={1}>
          {item.timing}
        </Text>

        <View style={S.capacityRow}>
          <Feather name="users" size={11} color={SgateColors.t4} />
          <Text style={S.capacityText}>Max {item.maxCapacity}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AmenitiesScreen() {
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading]     = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get('/resident/amenities');
        const list: any[] = res.data?.data ?? res.data ?? [];
        setAmenities((Array.isArray(list) ? list : []).map(normalise));
      } catch (err) {
        console.error('Failed to fetch amenities:', err);
      } finally { setLoading(false); }
    })();
  }, []));

  const myBookingsBtn = (
    <TouchableOpacity
      onPress={() => router.push('/(resident)/amenities/my-bookings' as any)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={S.myBookingsBtn}
      activeOpacity={0.7}
    >
      <Feather name="calendar" size={14} color="#111827" />
      <Text style={S.myBookingsBtnText}>My Bookings</Text>
    </TouchableOpacity>
  );

  if (loading) return (
    <AppScreenLayout title="Amenities" rightElement={myBookingsBtn}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={SgateColors.gold} />
      </View>
    </AppScreenLayout>
  );

  return (
    <AppScreenLayout title="Amenities" rightElement={myBookingsBtn}>
      {/* Grid */}
      <FlatList
        data={amenities}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={S.columnWrapper}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}><Feather name="home" size={32} color={SgateColors.t4} /><Text style={{ color: SgateColors.t3, marginTop: 12, fontFamily: SgateFonts.medium }}>No amenities available</Text></View>}
        renderItem={({ item, index }) => <AmenityCard item={item} index={index} />}
      />
    </AppScreenLayout>
  );
}

const S = StyleSheet.create({

  // Grid
  columnWrapper: {
    paddingHorizontal: 16, // Better edge breathing room
    gap: 16, // More breathing room between cards
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Card
  cardWrapper: {
    flex: 1,
    marginBottom: 16,
  },
  card: {
    backgroundColor: SgateColors.card, // Restored theme card color
    borderRadius: 24,
    padding: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1, // Restored theme text color
    marginTop: 16,
    marginBottom: 4,
  },
  cardTiming: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3, // Restored theme secondary text color
  },
  capacityRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  myBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SgateColors.card, // Restored theme card color
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  myBookingsBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1, // Restored theme text color
  },
});
