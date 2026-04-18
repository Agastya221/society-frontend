import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';

const C = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const F = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold' };

interface DailyHelper {
  id: string;
  name: string;
  type: string;         // normalised from backend staffType
  housesCount: number;
  isInside: boolean;    // normalised from backend isCurrentlyWorking
  isOpenToWork: boolean;
  rating: number;
}

interface DailyHelpType {
  type: string;
  label: string;
  count: number;
  icon: string;
}

// Maps backend staffType → feather icon name for display
const TYPE_ICON_MAP: Record<string, string> = {
  MAID: 'home', COOK: 'coffee', DRIVER: 'truck', MILKMAN: 'droplet',
  PAPERBOY: 'file-text', CAR_CLEANER: 'wind', NANNY: 'heart',
  TUITION_TEACHER: 'book-open', SKATING_INSTRUCTOR: 'activity',
  ELDERLY_CARETAKER: 'user', LAUNDRY: 'loader',
};

// Maps backend staffType → human label
const TYPE_LABEL_MAP: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', DRIVER: 'Driver', MILKMAN: 'Milkman',
  PAPERBOY: 'Paperboy', CAR_CLEANER: 'Car Cleaner', NANNY: 'Nanny',
  TUITION_TEACHER: 'Tuition Teacher', SKATING_INSTRUCTOR: 'Skating Instructor',
  ELDERLY_CARETAKER: 'Elderly Caretaker', LAUNDRY: 'Laundry',
};

function normaliseHelper(raw: any): DailyHelper {
  return {
    id:          raw.id,
    name:        raw.name ?? '',
    type:        raw.type ?? raw.staffType ?? '',
    housesCount: raw.housesCount ?? 0,
    // backend uses isCurrentlyWorking, frontend uses isInside
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
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState<DailyHelpType[]>([]);
  const [maids, setMaids] = useState<DailyHelper[]>([]);
  const [cooks, setCooks] = useState<DailyHelper[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [typesRes, maidsRes, cooksRes] = await Promise.all([
        api.get('/resident/daily-help/types'),
        api.get('/resident/daily-help', { params: { type: 'MAID' } }),
        api.get('/resident/daily-help', { params: { type: 'COOK' } }),
      ]);

      const rawTypes: any[] = typesRes.data?.data ?? typesRes.data ?? [];
      setTypes((Array.isArray(rawTypes) ? rawTypes : []).map((item: any) => ({
        type:  item.type ?? item.staffType ?? '',
        label: item.label ?? TYPE_LABEL_MAP[item.type ?? item.staffType] ?? item.type ?? '',
        count: item.count ?? 0,
        icon:  item.icon ?? TYPE_ICON_MAP[item.type ?? item.staffType] ?? 'user',
      })));

      const rawMaids: any[] = maidsRes.data?.data ?? maidsRes.data ?? [];
      setMaids((Array.isArray(rawMaids) ? rawMaids : []).slice(0, 4).map(normaliseHelper));

      const rawCooks: any[] = cooksRes.data?.data ?? cooksRes.data ?? [];
      setCooks((Array.isArray(rawCooks) ? rawCooks : []).slice(0, 4).map(normaliseHelper));
    } catch (err) {
      console.error('Failed to fetch daily help:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const navigateType = (type: string) => router.push({ pathname: '/(resident)/daily-help/[type]' as any, params: { type } });
  const navigateProfile = (id: string) => router.push({ pathname: '/(resident)/daily-help/profile/[id]' as any, params: { id } });

  const filteredTypes = types.filter(t => t.label.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <View style={s.safe}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={C.t1} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Daily Help</Text>
            <View style={{ width: 22 }} />
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
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.searchBar}>
          <Feather name="search" size={16} color={C.t3} />
          <TextInput style={s.searchInput} placeholder="Search by Name" placeholderTextColor={C.t4} value={search} onChangeText={setSearch} />
        </View>

        {maids.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Maids in your society</Text>
              <TouchableOpacity style={s.seeAllRow} onPress={() => navigateType('MAID')}>
                <Text style={s.seeAllText}>{types.find(t => t.type === 'MAID')?.count ?? 0}</Text>
                <Feather name="arrow-right" size={14} color={C.gold} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              {maids.map(m => <FeaturedCard key={m.id} helper={m} onPress={() => navigateProfile(m.id)} />)}
            </ScrollView>
          </>
        )}

        {cooks.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 24 }]}>
              <Text style={s.sectionTitle}>Cooks in your society</Text>
              <TouchableOpacity style={s.seeAllRow} onPress={() => navigateType('COOK')}>
                <Text style={s.seeAllText}>{types.find(t => t.type === 'COOK')?.count ?? 0}</Text>
                <Feather name="arrow-right" size={14} color={C.gold} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              {cooks.map(c => <FeaturedCard key={c.id} helper={c} onPress={() => navigateProfile(c.id)} />)}
            </ScrollView>
          </>
        )}

        <Text style={[s.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>All Daily Helps</Text>
        {filteredTypes.map(item => (
          <TouchableOpacity key={item.type} style={s.typeRow} activeOpacity={0.7} onPress={() => navigateType(item.type)}>
            <View style={s.typeIconCircle}><Feather name={item.icon as any} size={18} color={C.t2} /></View>
            <Text style={s.typeLabel}>{item.label}</Text>
            <Text style={s.typeCount}>{item.count}</Text>
            <Feather name="chevron-right" size={18} color={C.t4} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  headerTitle: { fontSize: 17, fontFamily: F.bold, color: C.t1 },
  content: { padding: 16, paddingBottom: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 20 },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.t1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: F.bold, color: C.t1 },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 14, fontFamily: F.semiBold, color: C.gold },
  featuredCard: { width: 140, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderSoft, padding: 14, marginHorizontal: 4, alignItems: 'center' },
  featuredAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featuredAvatarText: { fontSize: 22, fontFamily: F.bold, color: C.goldDeep },
  featuredName: { fontSize: 13, fontFamily: F.semiBold, color: C.t1, marginBottom: 4, textAlign: 'center' },
  featuredMeta: { fontSize: 11, fontFamily: F.regular, color: C.t3, marginBottom: 6, textAlign: 'center' },
  openBadge: { backgroundColor: C.goldPale, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  openBadgeText: { fontSize: 10, fontFamily: F.semiBold, color: C.goldDeep },
  typeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.borderSoft, padding: 14, marginBottom: 8, gap: 12 },
  typeIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { flex: 1, fontSize: 15, fontFamily: F.medium, color: C.t1 },
  typeCount: { fontSize: 14, fontFamily: F.semiBold, color: C.t3, marginRight: 4 },
});
