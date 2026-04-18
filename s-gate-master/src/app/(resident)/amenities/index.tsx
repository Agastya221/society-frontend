import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
  { keywords: ['swim', 'pool'],                     icon: 'droplet',    colorBg: '#DBEEFF', colorIcon: '#1A7FD4' },
  { keywords: ['gym', 'fitness', 'workout'],        icon: 'activity',   colorBg: '#FFE8E8', colorIcon: '#D94040' },
  { keywords: ['club', 'hall', 'lounge', 'party'],  icon: 'home',       colorBg: SgateColors.goldPale, colorIcon: SgateColors.goldDeep },
  { keywords: ['badminton', 'tennis', 'squash'],    icon: 'target',     colorBg: '#E8FFE8', colorIcon: '#2E9E4F' },
  { keywords: ['basket', 'cricket', 'football'],    icon: 'circle',     colorBg: '#FFF0DB', colorIcon: '#E07B00' },
  { keywords: ['kids', 'play', 'children'],         icon: 'smile',      colorBg: '#FFF8DB', colorIcon: '#D4A000' },
  { keywords: ['garden', 'terrace', 'park', 'lawn'],icon: 'sun',        colorBg: '#E8FFE8', colorIcon: '#2E9E4F' },
  { keywords: ['yoga', 'meditation', 'aerobic'],    icon: 'wind',       colorBg: '#EDE9FE', colorIcon: '#7C3AED' },
  { keywords: ['library', 'reading', 'study'],      icon: 'book-open',  colorBg: '#EDE9FE', colorIcon: '#5B21B6' },
  { keywords: ['parking', 'car', 'vehicle'],        icon: 'truck',      colorBg: '#F0F0F0', colorIcon: '#555555' },
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
          <Feather name={item.icon as any} size={24} color={item.colorIcon} />
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

  if (loading) return (
    <View style={S.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
        <View style={S.header} />
      </SafeAreaView>
      <View style={[S.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={SgateColors.gold} />
      </View>
    </View>
  );

  return (
    <View style={S.root}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Amenities</Text>
          <TouchableOpacity onPress={() => router.push('/(resident)/amenities/my-bookings' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={S.myBookingsBtn}>
            <Feather name="bookmark" size={14} color={SgateColors.goldDeep} />
            <Text style={S.myBookingsBtnText}>My Bookings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    </View>
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
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

  // Grid
  columnWrapper: {
    paddingHorizontal: 12,
    gap: 10,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Card
  cardWrapper: {
    flex: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  iconBubble: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginTop: 10,
    marginBottom: 2,
  },
  cardTiming: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  capacityRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityText: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
  myBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SgateColors.goldPale,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SgateColors.gold,
  },
  myBookingsBtnText: {
    fontSize: 12,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.goldDeep,
  },
});
