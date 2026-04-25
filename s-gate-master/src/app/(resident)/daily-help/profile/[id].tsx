import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
Linking, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';
import api from '../../../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WorksInEntry { flat: string; flatId: string; durationMonths: number }
interface RatingEntry  { label: string; count: number }

interface Helper {
  id: string;
  name: string;
  staffType: string;  // MAID | COOK | DRIVER | GARDENER etc.
  phone: string;
  isCurrentlyWorking: boolean;
  isVerified: boolean;
  rating: number;
  yearsInSociety: number;
  attendanceScore: string;
  housesCount: number;
  worksIn: WorksInEntry[];
  ratings: RatingEntry[];
}

function normalise(raw: any): Helper {
  return {
    id:                 raw.id,
    name:               raw.name ?? '',
    staffType:          raw.staffType ?? raw.type ?? 'HELPER',
    phone:              raw.phone ?? '',
    isCurrentlyWorking: raw.isCurrentlyWorking ?? raw.isInside ?? false,
    isVerified:         raw.isVerified ?? false,
    rating:             raw.rating ?? 0,
    yearsInSociety:     raw.yearsInSociety ?? 0,
    attendanceScore:    raw.attendanceScore ?? '0/30',
    housesCount:        raw.housesCount ?? (raw.worksIn?.length ?? 0),
    worksIn:            (raw.worksIn ?? []).map((w: any) => ({
      flat:           w.flat ?? '',
      flatId:         w.flatId ?? '',
      durationMonths: w.durationMonths ?? 0,
    })),
    ratings: (raw.ratings ?? []).map((r: any) => ({
      label: r.label ?? r.stars + ' star',
      count: r.count ?? 0,
    })),
  };
}

const RATING_ICONS: Array<'clock' | 'repeat' | 'star' | 'smile'> = ['clock', 'repeat', 'star', 'smile'];

const TYPE_LABELS: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', DRIVER: 'Driver',
  GARDENER: 'Gardener', SECURITY: 'Security', HELPER: 'Helper',
};

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function DailyHelpProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [helper, setHelper] = useState<Helper | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/resident/daily-help/${id}`);
        setHelper(normalise(res.data?.data ?? res.data));
      } catch (err) {
        console.error('Failed to fetch helper profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]));

  if (loading) {
    return (
      <View style={s.safe}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={SgateColors.t1} /></TouchableOpacity>
            <Text style={s.headerTitle}>Profile</Text>
            
          </View>
        </SafeAreaView>
        <AppLoader />
      </View>
    );
  }

  if (!helper) {
    return (
      <View style={s.safe}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={SgateColors.t1} /></TouchableOpacity>
            <Text style={s.headerTitle}>Profile</Text>
            
          </View>
        </SafeAreaView>
        <View style={s.center}><Text style={s.emptyTitle}>Profile not found</Text></View>
      </View>
    );
  }

  const typeLabel = TYPE_LABELS[helper.staffType] ?? helper.staffType;
  const totalRatings = helper.ratings.reduce((sum, r) => sum + r.count, 0);
  const maskedPhone = helper.phone.replace(/\d(?=\d{4})/g, '*');

  return (
    <View style={s.safe}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{typeLabel} Profile</Text>
          
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.content}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}><Text style={s.profileAvatarText}>{helper.name.charAt(0).toUpperCase()}</Text></View>
          {helper.isCurrentlyWorking && (
            <View style={s.insideBadge}><Text style={s.insideBadgeText}>Currently Inside</Text></View>
          )}
          <Text style={s.profileName}>{helper.name}</Text>
          <Text style={s.profilePhone}>{maskedPhone}</Text>
          <View style={s.profileActions}>
            <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL('tel:' + helper.phone.replace(/\s/g, ''))}>
              <Feather name="phone" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: `${helper.name} - ${typeLabel}` })}>
              <Feather name="share-2" size={20} color={SgateColors.t2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Attendance */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.cardIconWrap}><Feather name="calendar" size={18} color={SgateColors.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Attendance</Text>
              <Text style={s.cardSubtitle}>{helper.yearsInSociety} year{helper.yearsInSociety !== 1 ? 's' : ''} in society</Text>
            </View>
            <Text style={s.attendanceScore}>{helper.attendanceScore}</Text>
          </View>
        </View>

        {/* Ratings */}
        {helper.ratings.length > 0 && (
          <View style={s.card}>
            <View style={s.ratingsTopRow}>
              <Text style={s.ratingBig}>{helper.rating.toFixed(1)}</Text>
              <View>
                <View style={s.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Feather key={star} name="star" size={16} color={star <= Math.round(helper.rating) ? SgateColors.gold : SgateColors.borderSoft} />
                  ))}
                </View>
                <Text style={s.ratingCount}>{totalRatings} Ratings</Text>
              </View>
            </View>
            {helper.ratings.length > 0 && (
              <View style={s.ratingChipsRow}>
                {helper.ratings.slice(0, 4).map((r, i) => (
                  <View key={r.label} style={s.ratingChip}>
                    <View style={s.ratingIconCircle}>
                      <Feather name={RATING_ICONS[i % RATING_ICONS.length]} size={16} color={SgateColors.gold} />
                      <View style={s.ratingCountBadge}><Text style={s.ratingCountBadgeText}>{r.count}</Text></View>
                    </View>
                    <Text style={s.ratingChipLabel} numberOfLines={2}>{r.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Works in */}
        {helper.worksIn.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Works in {helper.housesCount} Houses</Text>
            {helper.worksIn.map((w, i) => (
              <View key={w.flatId || i} style={[s.worksInRow, i < helper.worksIn.length - 1 && s.worksInRowBorder]}>
                <Feather name="home" size={16} color={SgateColors.t3} />
                <Text style={s.worksInFlat}>{w.flat}</Text>
                <Text style={s.worksInDuration}>{w.durationMonths}mo</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 24, marginBottom: 12, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileAvatarText: { fontSize: 32, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  insideBadge: { backgroundColor: SgateColors.greenBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  insideBadgeText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.green },
  profileName: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
  profilePhone: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16 },
  profileActions: { flexDirection: 'row', gap: 12 },
  callBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: SgateColors.green, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  attendanceScore: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  ratingsTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ratingBig: { fontSize: 36, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  ratingCount: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  ratingChipsRow: { flexDirection: 'row', gap: 10 },
  ratingChip: { flex: 1, alignItems: 'center', gap: 6 },
  ratingIconCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
  ratingCountBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: SgateColors.card },
  ratingCountBadgeText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.black },
  ratingChipLabel: { fontSize: 10, fontFamily: SgateFonts.medium, color: SgateColors.t2, textAlign: 'center' },
  worksInRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  worksInRowBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  worksInFlat: { flex: 1, fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
  worksInDuration: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
