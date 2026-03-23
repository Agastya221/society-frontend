import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAILY_HELPERS, DAILY_HELP_TYPES, DailyHelper } from '../../../mocks/dailyHelp';

const C = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const F = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold', extraBold: 'Sora-ExtraBold' };

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
  const maids = DAILY_HELPERS.filter(h => h.type === 'MAID').slice(0, 4);
  const cooks = DAILY_HELPERS.filter(h => h.type === 'COOK').slice(0, 4);
  const filteredTypes = DAILY_HELP_TYPES.filter(t => t.label.toLowerCase().includes(search.toLowerCase()));

  const navigateType = (type: string) => router.push({ pathname: '/(resident)/daily-help/[type]' as any, params: { type } });
  const navigateProfile = (id: string) => router.push({ pathname: '/(resident)/daily-help/profile/[id]' as any, params: { id } });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Daily Help</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.searchBar}>
          <Feather name="search" size={16} color={C.t3} />
          <TextInput style={s.searchInput} placeholder="Search by Name" placeholderTextColor={C.t4} value={search} onChangeText={setSearch} />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Maids in your society</Text>
          <TouchableOpacity style={s.seeAllRow} onPress={() => navigateType('MAID')}>
            <Text style={s.seeAllText}>{DAILY_HELP_TYPES.find(t => t.type === 'MAID')?.count ?? 0}</Text>
            <Feather name="arrow-right" size={14} color={C.gold} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {maids.map(m => <FeaturedCard key={m.id} helper={m} onPress={() => navigateProfile(m.id)} />)}
        </ScrollView>

        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>Cooks in your society</Text>
          <TouchableOpacity style={s.seeAllRow} onPress={() => navigateType('COOK')}>
            <Text style={s.seeAllText}>{DAILY_HELP_TYPES.find(t => t.type === 'COOK')?.count ?? 0}</Text>
            <Feather name="arrow-right" size={14} color={C.gold} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {cooks.map(c => <FeaturedCard key={c.id} helper={c} onPress={() => navigateProfile(c.id)} />)}
        </ScrollView>

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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
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
