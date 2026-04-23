import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../../../services/api';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

interface LocalContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  addedBy: { name: string; initials: string };
  likes: number;
  isLikedByMe: boolean;
  timeAgo: string;
}

function getCategoryIcon(name: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string } {
  const lower = name.toLowerCase();
  if (lower.includes('plumber')) return { icon: 'pipe-wrench', color: '#3B82F6', bg: '#EFF6FF' }; // Soft Blue
  if (lower.includes('electrician')) return { icon: 'lightning-bolt', color: '#F97316', bg: '#FFF7ED' }; // Soft Orange
  if (lower.includes('carpenter')) return { icon: 'hammer-screwdriver', color: '#D97706', bg: '#FEF3C7' }; // Soft Amber
  if (lower.includes('painter')) return { icon: 'format-paint', color: '#A855F7', bg: '#FAF5FF' }; // Soft Purple
  if (lower.includes('cleaner')) return { icon: 'broom', color: '#14B8A6', bg: '#F0FDFA' }; // Soft Teal
  if (lower.includes('gardener')) return { icon: 'leaf', color: '#22C55E', bg: '#F0FDF4' }; // Soft Green
  if (lower.includes('pest')) return { icon: 'bug', color: '#EF4444', bg: '#FEF2F2' }; // Soft Red
  if (lower.includes('security')) return { icon: 'shield-account', color: '#4B5563', bg: '#F3F4F6' }; // Soft Gray
  if (lower.includes('medical') || lower.includes('doctor')) return { icon: 'hospital-box', color: '#EF4444', bg: '#FEF2F2' }; // Soft Red
  return { icon: 'briefcase', color: '#6B7280', bg: '#F3F4F6' }; // Soft Gray
}

function timeAgoFromISO(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days < 30) return `${days} Day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} Year${years !== 1 ? 's' : ''} ago`;
}

function toInitials(name?: string): string {
  if (!name) return '??';
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function normaliseContact(raw: any): LocalContact {
  const addedBy = raw.addedBy ?? {};
  return {
    id:       raw.id,
    name:     raw.name ?? '',
    category: raw.category ?? '',
    phone:    raw.phone ?? '',
    addedBy: {
      name:     addedBy.name ?? 'Unknown',
      initials: addedBy.initials ?? toInitials(addedBy.name),
    },
    likes:       raw.likes ?? raw.likesCount ?? 0,
    isLikedByMe: raw.isLikedByMe ?? false,
    timeAgo: raw.timeAgo ?? (raw.createdAt ? timeAgoFromISO(raw.createdAt) : ''),
  };
}

export default function CategoryContacts() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resident/local-directory', { params: { category } });
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw)
        ? raw
        : (raw?.contacts ?? raw?.vendors ?? raw?.items ?? raw?.results ?? raw?.data ?? []);
      setContacts(list.map(normaliseContact));
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchContacts(); }, [category]));

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleLike = async (id: string) => {
    setContacts(prev => prev.map(c =>
      c.id === id
        ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 }
        : c,
    ));
    try {
      await api.post(`/resident/local-directory/${id}/like`);
    } catch {
      setContacts(prev => prev.map(c =>
        c.id === id
          ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 }
          : c,
      ));
    }
  };

  const renderContact = ({ item, index }: { item: LocalContact; index: number }) => {
    const { icon, color, bg } = getCategoryIcon(item.category || category || '');

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
        <TouchableOpacity style={styles.card} activeOpacity={0.6}
          onPress={() => router.push({ pathname: '/(resident)/local-directory/contact/[id]' as any, params: { id: item.id } })}>
          
          <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.contactName}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{item.category.toUpperCase()}</Text>
              <Text style={styles.dot}>·</Text>
              <TouchableOpacity style={styles.likeRow} onPress={() => toggleLike(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="thumbs-up" size={12} color={item.isLikedByMe ? SgateColors.goldDeep : '#9CA3AF'} />
                <Text style={[styles.metaText, item.isLikedByMe && { color: SgateColors.goldDeep }]}>{item.likes}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addedRow}>
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>{item.addedBy.initials}</Text>
              </View>
              <Text style={styles.addedByText}>Added by {item.addedBy.name}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.timeAgoText}>{item.timeAgo}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL('tel:' + item.phone.replace(/\s/g, ''))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="phone" size={18} color="#10B981" />
          </TouchableOpacity>
          
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={category ?? 'Category'} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Feather name="search" size={18} color={isSearchFocused ? SgateColors.goldDeep : SgateColors.t3} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search name..." 
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
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="users" size={36} color={SgateColors.t4} />
              <Text style={styles.emptyTitle}>No contacts found</Text>
              <Text style={styles.emptySubtitle}>Be the first to add a contact!</Text>
            </View>
          }
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
    borderColor: 'transparent',
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
    paddingVertical: 0, 
  },
  clearIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SgateColors.t4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { 
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
    elevation: 1,
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
  cardContent: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 16, fontFamily: SgateFonts.semibold, color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: '#9CA3AF', letterSpacing: 0.5 },
  dot: { fontSize: 12, color: '#D1D5DB' },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  initialsCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 8, fontFamily: SgateFonts.bold, color: '#D97706' },
  addedByText: { fontSize: 12, fontFamily: SgateFonts.medium, color: '#6B7280' },
  timeAgoText: { fontSize: 11, fontFamily: SgateFonts.regular, color: '#9CA3AF' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#D1FAE5', // Soft green background
    alignItems: 'center', 
    justifyContent: 'center' 
  },
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
