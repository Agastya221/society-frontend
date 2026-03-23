import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOCAL_CONTACTS, LocalContact } from '../../../mocks/localDirectory';

const SgateColors = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', greenBg: '#E5FBF3', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const SgateFonts = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold', extraBold: 'Sora-ExtraBold' };

export default function CategoryContacts() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [search, setSearch] = useState('');

  const contacts = LOCAL_CONTACTS.filter(c => c.category === category);
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const renderContact = ({ item }: { item: LocalContact }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/(resident)/local-directory/contact/[id]' as any, params: { id: item.id } })}>
      <View style={styles.contactIconCircle}><Feather name="tool" size={20} color={SgateColors.t3} /></View>
      <View style={styles.cardContent}>
        <Text style={styles.contactName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.category}</Text>
          <Text style={styles.dot}>·</Text>
          <Feather name="thumbs-up" size={12} color={SgateColors.t3} />
          <Text style={styles.metaText}>{item.likes}</Text>
        </View>
        <View style={styles.addedRow}>
          <View style={styles.initialsCircle}><Text style={styles.initialsText}>{item.addedBy.initials}</Text></View>
          <Text style={styles.addedByText}>Added by {item.addedBy.name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL('tel:' + item.phone.replace(/\s/g, ''))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="phone" size={18} color={SgateColors.green} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category}</Text>
        <View style={{ width: 22 }} />
      </View>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  listContent: { padding: 16, paddingBottom: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 12, borderWidth: 1, borderColor: SgateColors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 14, marginBottom: 10, gap: 12 },
  contactIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: SgateFonts.semiBold, color: SgateColors.t1, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  dot: { fontSize: 12, color: SgateColors.t4 },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  initialsCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  addedByText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  timeAgo: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
  phoneBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.greenBg, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semiBold, color: SgateColors.t2 },
  emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SgateColors.gold, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  fabLabel: { fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.black },
});
