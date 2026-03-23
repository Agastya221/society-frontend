import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOCAL_CATEGORIES, LocalCategory } from '../../../mocks/localDirectory';

const SgateColors = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', greenBg: '#E5FBF3', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const SgateFonts = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold', extraBold: 'Sora-ExtraBold' };

export default function LocalDirectoryIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const filtered = LOCAL_CATEGORIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: LocalCategory }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(resident)/local-directory/[category]' as any, params: { category: item.name } })}>
      <View style={styles.iconCircle}><Feather name="tool" size={18} color={SgateColors.t2} /></View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowCount}>{item.count} contact{item.count !== 1 ? 's' : ''}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={SgateColors.t4} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Local Directory</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList data={filtered} keyExtractor={item => item.name} renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View>
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color={SgateColors.t3} />
            <TextInput style={styles.searchInput} placeholder="Search Category or Name" placeholderTextColor={SgateColors.t4} value={search} onChangeText={setSearch} />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Feather name="x" size={16} color={SgateColors.t3} /></TouchableOpacity>}
          </View>
          <Text style={styles.subtitle}>Discover useful contacts shared by residents. Contribute to grow this list.</Text>
        </View>}
        ListEmptyComponent={<View style={styles.emptyWrap}>
          <Feather name="search" size={32} color={SgateColors.t4} />
          <Text style={styles.emptyTitle}>No categories found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>}
      />
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="plus" size={18} color={SgateColors.black} />
        <Text style={styles.fabLabel}>Add contact</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  listContent: { padding: 16, paddingBottom: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 12, borderWidth: 1, borderColor: SgateColors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t1 },
  subtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 14, marginBottom: 10, gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: SgateFonts.semiBold, color: SgateColors.t1, marginBottom: 2 },
  rowCount: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semiBold, color: SgateColors.t2 },
  emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SgateColors.gold, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  fabLabel: { fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.black },
});
