import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAILY_HELPERS, DAILY_HELP_TYPES } from '../../../../mocks/dailyHelp';

const C = { black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1', green: '#00D68F', bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE', borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0' };
const F = { regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold', bold: 'Sora-Bold', extraBold: 'Sora-ExtraBold' };
const RATING_ICONS: Array<'clock' | 'repeat' | 'star' | 'smile'> = ['clock', 'repeat', 'star', 'smile'];

export default function DailyHelpProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const helper = DAILY_HELPERS.find(h => h.id === id);

  if (!helper) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={C.t1} /></TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={s.emptyWrap}><Text style={s.emptyTitle}>Profile not found</Text></View>
      </SafeAreaView>
    );
  }

  const typeInfo = DAILY_HELP_TYPES.find(t => t.type === helper.type);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{typeInfo?.label ?? helper.type} Profile</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.profileCard}>
          <View style={s.profileAvatar}><Text style={s.profileAvatarText}>{helper.name.charAt(0)}</Text></View>
          {helper.isOpenToWork && <View style={s.openBadge}><Text style={s.openBadgeText}>Open to work</Text></View>}
          <Text style={s.profileName}>{helper.name}</Text>
          <Text style={s.profilePhone}>{helper.phone}</Text>
          <View style={s.profileActions}>
            <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL('tel:9999999999')}>
              <Feather name="phone" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: helper.name + ' - ' + (typeInfo?.label ?? helper.type) })}>
              <Feather name="share-2" size={20} color={C.t2} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.cardIconWrap}><Feather name="calendar" size={18} color={C.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Attendance</Text>
              <Text style={s.cardSubtitle}>Last checked in today</Text>
            </View>
            <Text style={s.attendanceScore}>{helper.attendanceScore}</Text>
          </View>
        </View>
        <View style={s.card}>
          <View style={s.ratingsTopRow}>
            <Text style={s.ratingBig}>{helper.rating.toFixed(1)}</Text>
            <View>
              <View style={s.starsRow}>
                {[1,2,3,4,5].map(star => <Feather key={star} name="star" size={16} color={star <= Math.round(helper.rating) ? C.gold : C.border} />)}
              </View>
              <Text style={s.ratingCount}>{helper.ratings.reduce((sum, r) => sum + r.count, 0)} Ratings</Text>
            </View>
          </View>
          <View style={s.ratingChipsRow}>
            {helper.ratings.map((r, i) => (
              <View key={r.label} style={s.ratingChip}>
                <View style={s.ratingIconCircle}>
                  <Feather name={RATING_ICONS[i % RATING_ICONS.length]} size={16} color={C.gold} />
                  <View style={s.ratingCountBadge}><Text style={s.ratingCountBadgeText}>{r.count}</Text></View>
                </View>
                <Text style={s.ratingChipLabel} numberOfLines={2}>{r.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Works in {helper.housesCount} Houses</Text>
          <Text style={s.worksInSubtitle}>Working in your society for {helper.yearsInSociety} year{helper.yearsInSociety !== 1 ? 's' : ''}</Text>
          {helper.worksIn.map((w, i) => (
            <View key={i} style={[s.worksInRow, i < helper.worksIn.length - 1 && s.worksInRowBorder]}>
              <Feather name="home" size={16} color={C.t3} />
              <Text style={s.worksInFlat}>{w.flat}</Text>
              <Text style={s.worksInDuration}>{w.duration}</Text>
              <Feather name="phone" size={14} color={C.green} />
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.addBtn}>
          <Feather name="plus" size={18} color={C.black} />
          <Text style={s.addBtnText}>Add to Household</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  headerTitle: { fontSize: 17, fontFamily: F.bold, color: C.t1 },
  content: { padding: 16, paddingBottom: 100 },
  profileCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.borderSoft, padding: 24, marginBottom: 12, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileAvatarText: { fontSize: 32, fontFamily: F.bold, color: C.goldDeep },
  openBadge: { backgroundColor: C.goldPale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  openBadgeText: { fontSize: 12, fontFamily: F.semiBold, color: C.goldDeep },
  profileName: { fontSize: 20, fontFamily: F.bold, color: C.t1, marginBottom: 4 },
  profilePhone: { fontSize: 14, fontFamily: F.regular, color: C.t3, marginBottom: 16 },
  profileActions: { flexDirection: 'row', gap: 12 },
  callBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.borderSoft, padding: 16, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontFamily: F.semiBold, color: C.t1, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, fontFamily: F.regular, color: C.t3 },
  attendanceScore: { fontSize: 22, fontFamily: F.bold, color: C.t1 },
  ratingsTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ratingBig: { fontSize: 36, fontFamily: F.extraBold, color: C.t1 },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  ratingCount: { fontSize: 12, fontFamily: F.regular, color: C.t3 },
  ratingChipsRow: { flexDirection: 'row', gap: 10 },
  ratingChip: { flex: 1, alignItems: 'center', gap: 6 },
  ratingIconCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.goldPale, alignItems: 'center', justifyContent: 'center' },
  ratingCountBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  ratingCountBadgeText: { fontSize: 9, fontFamily: F.bold, color: C.black },
  ratingChipLabel: { fontSize: 10, fontFamily: F.medium, color: C.t2, textAlign: 'center' },
  worksInSubtitle: { fontSize: 12, fontFamily: F.regular, color: C.t3, marginBottom: 12, marginTop: 4 },
  worksInRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  worksInRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  worksInFlat: { flex: 1, fontSize: 14, fontFamily: F.medium, color: C.t1 },
  worksInDuration: { fontSize: 12, fontFamily: F.regular, color: C.t3 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft, padding: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, borderRadius: 16, paddingVertical: 16 },
  addBtnText: { fontSize: 15, fontFamily: F.semiBold, color: C.black },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: F.semiBold, color: C.t2 },
});
