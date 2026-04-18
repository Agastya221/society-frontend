import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';

const C = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const F = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold' };

const TYPE_LABEL_MAP: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', DRIVER: 'Driver', MILKMAN: 'Milkman',
  PAPERBOY: 'Paperboy', CAR_CLEANER: 'Car Cleaner', NANNY: 'Nanny',
  TUITION_TEACHER: 'Tuition Teacher', SKATING_INSTRUCTOR: 'Skating Instructor',
  ELDERLY_CARETAKER: 'Elderly Caretaker', LAUNDRY: 'Laundry',
};

interface DailyHelper {
  id: string;
  name: string;
  type: string;
  housesCount: number;
  isInside: boolean;
  isOpenToWork: boolean;
  rating: number;
}

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

const FILTERS = ['Inside', 'Newly added', 'Open to work'];

export default function DailyHelpTypeList() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<DailyHelper[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHelpers = async () => {
    try {
      const res = await api.get('/resident/daily-help');
      const apiData = res.data?.data ?? res.data;
      
      // Extract staff array correctly whether it's nested in .staff or direct
      const list: any[] = Array.isArray(apiData?.staff) ? apiData.staff : (Array.isArray(apiData) ? apiData : []);
      
      console.log("Selected Type:", type);
      console.log("Staff Types:", list.map(s => s.staffType ?? s.type));

      // Filter staff by selected type (case insensitive matching)
      const selectedTypeStr = String(type).toUpperCase();
      const filteredStaff = list.filter((item: any) => {
        const itemType = String(item.staffType ?? item.type ?? '').toUpperCase();
        return itemType === selectedTypeStr;
      });

      setHelpers(filteredStaff.map(normaliseHelper));
    } catch (err) {
      console.error('Failed to fetch daily help list:', err);
      setHelpers([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHelpers(); }, [type]));

  let filtered = helpers.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
  if (activeFilter === 'Inside') filtered = filtered.filter(h => h.isInside);
  if (activeFilter === 'Open to work') filtered = filtered.filter(h => h.isOpenToWork);

  const typeLabel = TYPE_LABEL_MAP[type] ?? type;

  const renderItem = ({ item }: { item: DailyHelper }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/(resident)/daily-help/profile/[id]' as any, params: { id: item.id } })}>
      <View style={s.avatar}>
        {item.isInside && <View style={s.onlineDot} />}
        <Text style={s.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={s.cardContent}>
        <Text style={s.helperName}>{item.name}</Text>
        <Text style={s.helperMeta}>{item.housesCount} Houses - {item.rating.toFixed(1)} stars</Text>
        {item.isOpenToWork && <View style={s.openBadge}><Text style={s.openBadgeText}>Open to work</Text></View>}
      </View>
      <Feather name="chevron-right" size={18} color={C.t4} />
    </TouchableOpacity>
  );

  return (
    <View style={s.safe}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{typeLabel}</Text>
          
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.gold} /></View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <View>
              <View style={s.searchBar}>
                <Feather name="search" size={16} color={C.t3} />
                <TextInput style={s.searchInput} placeholder="Search by Name" placeholderTextColor={C.t4} value={search} onChangeText={setSearch} />
              </View>
              <View style={s.filtersRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity key={f} style={[s.filterChip, activeFilter === f && s.filterChipActive]}
                    onPress={() => setActiveFilter(activeFilter === f ? null : f)}>
                    {f === 'Inside' && <View style={[s.dot, activeFilter === f && s.dotActive]} />}
                    <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name="users" size={32} color={C.t4} />
              <Text style={s.emptyTitle}>No staff available</Text>
              <Text style={s.emptySubtitle}>None found for this category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: F.semiBold, color: C.t1, marginLeft: 12, flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.t1 },
  filtersRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  filterChipActive: { backgroundColor: C.goldPale, borderColor: C.gold },
  filterChipText: { fontSize: 12, fontFamily: F.medium, color: C.t3 },
  filterChipTextActive: { color: C.goldDeep },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.t3 },
  dotActive: { backgroundColor: C.green },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderSoft, padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: C.green, borderWidth: 2, borderColor: C.card, zIndex: 1 },
  avatarText: { fontSize: 20, fontFamily: F.bold, color: C.goldDeep },
  cardContent: { flex: 1 },
  helperName: { fontSize: 15, fontFamily: F.semiBold, color: C.t1, marginBottom: 3 },
  helperMeta: { fontSize: 12, fontFamily: F.regular, color: C.t3, marginBottom: 5 },
  openBadge: { alignSelf: 'flex-start', backgroundColor: C.goldPale, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  openBadgeText: { fontSize: 10, fontFamily: F.semiBold, color: C.goldDeep },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: F.semiBold, color: C.t2 },
  emptySubtitle: { fontSize: 13, fontFamily: F.regular, color: C.t3 },
});
