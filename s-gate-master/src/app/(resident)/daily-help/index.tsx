import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 12;
const CARD_W = (SCREEN_W - 32 - GAP * 2) / 3;
const CARD_H = CARD_W * 1.15;

const C = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', bg: '#F9FAFB', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const F = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold' };

interface DailyHelper {
  id: string;
  name: string;
  type: string;
  housesCount: number;
  isInside: boolean;
  isOpenToWork: boolean;
  rating: number;
}

interface DailyHelpType {
  type: string;
  label: string;
  count: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

// Maps backend staffType → MaterialCommunityIcons
const TYPE_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  MAID: 'home', COOK: 'chef-hat', DRIVER: 'car', MILKMAN: 'bottle-wine',
  PAPERBOY: 'newspaper', CAR_CLEANER: 'car-wash', NANNY: 'baby-carriage',
  TUITION_TEACHER: 'book-open-page-variant', SKATING_INSTRUCTOR: 'skate',
  ELDERLY_CARETAKER: 'human-cane', LAUNDRY: 'tshirt-crew',
  CLEANER: 'broom', GARDENER: 'leaf'
};

const TYPE_LABEL_MAP: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', DRIVER: 'Driver', MILKMAN: 'Milkman',
  PAPERBOY: 'Paperboy', CAR_CLEANER: 'Car Cleaner', NANNY: 'Nanny',
  TUITION_TEACHER: 'Tuition', SKATING_INSTRUCTOR: 'Skating',
  ELDERLY_CARETAKER: 'Caretaker', LAUNDRY: 'Laundry',
  CLEANER: 'Cleaner', GARDENER: 'Gardener'
};

function normaliseHelper(raw: any): DailyHelper {
  return {
    id:          raw.id,
    name:        raw.name ?? '',
    type:        raw.type ?? raw.staffType ?? '',
    housesCount: raw.housesCount ?? 0,
    isInside:    raw.isInside ?? raw.isCurrentlyWorking ?? false,
    isOpenToWork: raw.isOpenToWork ?? false,
    rating:      raw.rating ?? 0,
  };
}

function FeaturedCard({ helper, onPress }: { helper: DailyHelper; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.featuredCard} activeOpacity={0.75} onPress={onPress}>
      <View style={s.featuredAvatar}><Text style={s.featuredAvatarText}>{helper.name.charAt(0)}</Text></View>
      <Text style={s.featuredName} numberOfLines={1}>{helper.name}</Text>
      <Text style={s.featuredMeta}>{helper.housesCount} Houses</Text>
      {helper.isOpenToWork && <View style={s.openBadge}><Text style={s.openBadgeText}>Open to work</Text></View>}
    </TouchableOpacity>
  );
}

export default function DailyHelpIndex() {
  const router = useRouter();
  const [types, setTypes] = useState<DailyHelpType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/resident/daily-help/types');
      const rawTypes: any[] = res.data?.data ?? res.data ?? [];
      setTypes((Array.isArray(rawTypes) ? rawTypes : []).map((item: any) => ({
        type:  item.type ?? item.staffType ?? '',
        label: item.label ?? TYPE_LABEL_MAP[item.type ?? item.staffType] ?? item.type ?? '',
        count: item.count ?? 0,
        icon:  (TYPE_ICON_MAP[item.type ?? item.staffType] ?? 'account-group') as any,
      })));
    } catch (err) {
      console.error('Failed to fetch daily help types:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const navigateType = (type: string) => router.push({ pathname: '/(resident)/daily-help/[type]' as any, params: { type } });

  if (loading) {
    return (
      <View style={s.safe}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={C.t1} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Daily Help</Text>
          </View>
        </SafeAreaView>
        <View style={s.center}><ActivityIndicator size="large" color={C.gold} /></View>
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Daily Help</Text>
        </View>
      </SafeAreaView>
      
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>All Daily Helps</Text>
        <View style={s.gridContainer}>
          {types.map(item => (
            <TouchableOpacity key={item.type} style={s.gridItem} activeOpacity={0.7} onPress={() => navigateType(item.type)}>
              <View style={s.gridIconCircle}>
                <MaterialCommunityIcons name={item.icon} size={28} color={C.goldDeep} />
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>


      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: F.semiBold, color: C.t1, marginLeft: 12, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  
  sectionTitle: { fontSize: 16, fontFamily: F.bold, color: C.t1, marginBottom: 16 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  gridItem: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: C.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridIconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gridLabel: { fontSize: 14, fontFamily: F.semiBold, color: C.t1, textAlign: 'center' },


});
