import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../../services/api';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

interface LocalCategory {
  name: string;
  count: number;
}

export default function LocalDirectoryIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/resident/local-directory/categories');
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw) ? raw : (raw?.categories ?? raw?.items ?? raw?.data ?? []);
      // Backend sends { category, count } — map to { name, count }
      setCategories(list.map(item => ({
        name: item.name ?? item.category ?? '',
        count: item.count ?? 0,
      })));
    } catch (err) {
      console.error('Failed to fetch local directory categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCategories(); }, []));

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

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
    <View style={styles.root}>
      <ScreenHeader title="Local Directory" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
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
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="plus" size={18} color={SgateColors.black} />
        <Text style={styles.fabLabel}>Add contact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 12, borderWidth: 1, borderColor: SgateColors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t1 },
  subtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 14, marginBottom: 10, gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
  rowCount: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SgateColors.gold, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  fabLabel: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.black },
});
