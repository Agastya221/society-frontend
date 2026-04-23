import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../../services/api';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

interface LocalContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  addedBy: { name: string; initials: string };
  likes: number;      // normalised from backend's likesCount
  isLikedByMe: boolean;
  timeAgo: string;    // computed from createdAt
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
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resident/local-directory', { params: { category } });
      console.log('LOCAL DIR RAW:', JSON.stringify(res.data));
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw)
        ? raw
        : (raw?.contacts ?? raw?.vendors ?? raw?.items ?? raw?.results ?? raw?.data ?? []);
      console.log('LOCAL DIR LIST length:', list.length, 'keys:', raw && typeof raw === 'object' ? Object.keys(raw) : raw);
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
    // Optimistic update
    setContacts(prev => prev.map(c =>
      c.id === id
        ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 }
        : c,
    ));
    try {
      await api.post(`/resident/local-directory/${id}/like`);
    } catch {
      // Revert on failure
      setContacts(prev => prev.map(c =>
        c.id === id
          ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 }
          : c,
      ));
    }
  };

  const renderContact = ({ item }: { item: LocalContact }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/(resident)/local-directory/contact/[id]' as any, params: { id: item.id } })}>
      <View style={styles.contactIconCircle}><Feather name="tool" size={20} color={SgateColors.t3} /></View>
      <View style={styles.cardContent}>
        <Text style={styles.contactName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.category}</Text>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity style={styles.likeRow} onPress={() => toggleLike(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Feather name="thumbs-up" size={12} color={item.isLikedByMe ? SgateColors.gold : SgateColors.t3} />
            <Text style={[styles.metaText, item.isLikedByMe && { color: SgateColors.goldDeep }]}>{item.likes}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.addedRow}>
          <View style={styles.initialsCircle}><Text style={styles.initialsText}>{item.addedBy.initials}</Text></View>
          <Text style={styles.addedByText}>Added by {item.addedBy.name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timeAgoText}>{item.timeAgo}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL('tel:' + item.phone.replace(/\s/g, ''))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="phone" size={18} color={SgateColors.green} />
      </TouchableOpacity>
    </TouchableOpacity>
  );


  return (
    <View style={styles.root}>
      <ScreenHeader title={category ?? 'Category'} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={styles.searchBar}>
            <Feather name="search" size={16} color={SgateColors.t3} />
            <TextInput style={styles.searchInput} placeholder="Search Name" placeholderTextColor={SgateColors.t4} value={search} onChangeText={setSearch} />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Feather name="x" size={16} color={SgateColors.t3} /></TouchableOpacity>}
          </View>}
          ListEmptyComponent={<View style={styles.emptyWrap}>
            <Feather name="users" size={32} color={SgateColors.t4} />
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptySubtitle}>Be the first to add a contact!</Text>
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
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 12, borderWidth: 1, borderColor: SgateColors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 14, marginBottom: 10, gap: 12 },
  contactIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  dot: { fontSize: 12, color: SgateColors.t4 },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  initialsCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  addedByText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  timeAgoText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  phoneBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.greenBg, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SgateColors.gold, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  fabLabel: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.black },
});
