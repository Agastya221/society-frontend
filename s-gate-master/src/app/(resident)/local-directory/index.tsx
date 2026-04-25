import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../../../services/api';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

interface LocalCategory {
  name: string;
  count: number;
}

function getCategoryIcon(name: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string } {
  const lower = name.toLowerCase();
  // Uber/Notion style: very soft backgrounds with subtle, non-harsh icon colors
  if (lower.includes('plumber')) return { icon: 'pipe-wrench', color: '#3B82F6', bg: '#EFF6FF' }; // Soft Blue
  if (lower.includes('electrician')) return { icon: 'lightning-bolt', color: '#F97316', bg: '#FFF7ED' }; // Soft Orange
  if (lower.includes('carpenter')) return { icon: 'hammer-screwdriver', color: '#D97706', bg: '#FEF3C7' }; // Soft Amber
  if (lower.includes('painter')) return { icon: 'format-paint', color: '#A855F7', bg: '#FAF5FF' }; // Soft Purple
  if (lower.includes('cleaner')) return { icon: 'broom', color: '#14B8A6', bg: '#F0FDFA' }; // Soft Teal
  if (lower.includes('gardener')) return { icon: 'leaf', color: '#22C55E', bg: '#F0FDF4' }; // Soft Green
  if (lower.includes('pest')) return { icon: 'bug', color: '#EF4444', bg: '#FEF2F2' }; // Soft Red
  if (lower.includes('security')) return { icon: 'shield-account', color: '#4B5563', bg: '#F3F4F6' }; // Soft Gray
  if (lower.includes('medical') || lower.includes('doctor')) return { icon: 'hospital-box', color: '#EF4444', bg: '#FEF2F2' }; // Soft Red
  
  // Default
  return { icon: 'briefcase', color: '#6B7280', bg: '#F3F4F6' }; // Soft Gray
}

export default function LocalDirectoryIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

  const renderItem = ({ item, index }: { item: LocalCategory; index: number }) => {
    const { icon, color, bg } = getCategoryIcon(item.name);
    // Capitalize properly: "Plumber" instead of "PLUMBER"
    const displayName = item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase();

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
        <TouchableOpacity style={styles.row} activeOpacity={0.6}
          onPress={() => router.push({ pathname: '/(resident)/local-directory/[category]' as any, params: { category: item.name } })}>
          <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowName}>{displayName}</Text>
            <Text style={styles.rowCount}>{item.count} contact{item.count !== 1 ? 's' : ''}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#D1D5DB" style={styles.chevron} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Local Directory" />

      {loading ? (
        <AppLoader />
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.name} renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View>
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Feather name="search" size={18} color={isSearchFocused ? SgateColors.goldDeep : SgateColors.t3} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search category or name..." 
                placeholderTextColor={SgateColors.t4} 
                value={search} 
                onChangeText={setSearch} 
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={styles.clearIconWrap}>
                    <Feather name="x" size={14} color={SgateColors.card} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.subtitle}>Discover useful contacts shared by residents. Contribute to grow this list.</Text>
          </View>}
          ListEmptyComponent={<View style={styles.emptyWrap}>
            <Feather name="search" size={36} color={SgateColors.t4} />
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
  listContent: { padding: 20, paddingBottom: 100 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 54, 
    gap: 12, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent', // Allows smooth transition to focus border
  },
  searchBarFocused: {
    borderColor: SgateColors.gold,
    shadowColor: SgateColors.goldDeep,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: { 
    flex: 1, 
    fontFamily: SgateFonts.medium, 
    fontSize: 15, 
    color: SgateColors.t1,
    paddingVertical: 0, // fix for android centering
  },
  clearIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SgateColors.t4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 20, lineHeight: 20 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 18, 
    padding: 16, 
    marginBottom: 12, 
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1, // minimal elevation
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  rowContent: { flex: 1, justifyContent: 'center' },
  rowName: { fontSize: 16, fontFamily: SgateFonts.semibold, color: '#111827', marginBottom: 2 },
  rowCount: { fontSize: 13, fontFamily: SgateFonts.medium, color: '#6B7280' },
  chevron: { marginLeft: 'auto' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  emptySubtitle: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  fab: { 
    position: 'absolute', 
    bottom: 24, 
    right: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: SgateColors.gold, 
    borderRadius: 28, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    shadowColor: '#FFB800', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8 
  },
  fabLabel: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.black },
});
