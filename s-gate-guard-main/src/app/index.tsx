import { GuardBrandMark } from '@/components/GuardBrandMark';
import { GuardColors, GuardFonts, GuardRadius } from '@/constants/theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHIFT_LABEL: Record<string, string> = { MORNING: 'Morning shift', EVENING: 'Evening shift', NIGHT: 'Night shift' };

type Route = '/new-entry' | '/scan-verify' | '/today-entries' | '/approvals' | '/staff-scan' | '/profile' | '/emergencies';

const quickActions: { label: string; detail: string; icon: keyof typeof Ionicons.glyphMap; route: Route }[] = [
  { label: "Today's entries", detail: 'View gate activity', icon: 'receipt-outline', route: '/today-entries' },
  { label: 'Approvals', detail: 'Resident responses', icon: 'checkmark-done-outline', route: '/approvals' },
  { label: 'Staff check-in', detail: 'Verify staff ID', icon: 'people-outline', route: '/staff-scan' },
  { label: 'My profile', detail: 'Duty and gate details', icon: 'person-outline', route: '/profile' },
];

export default function GuardDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(useCallback(() => {
    api.get('/api/v1/gate/entry-requests?status=PENDING').then((res) => {
      const payload = res.data?.data;
      const entries: unknown[] = payload?.entryRequests ?? payload?.entries ?? (Array.isArray(payload) ? payload : []);
      setPendingCount(Array.isArray(entries) ? entries.length : 0);
    }).catch(() => undefined);
  }, []));

  const open = (route: Route, strong = false) => {
    Haptics.impactAsync(strong ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    router.push(route);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={GuardColors.bg} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <GuardBrandMark compact />
          <Pressable style={styles.avatar} onPress={() => open('/profile')}><Text style={styles.avatarText}>{(user?.name ?? 'G').charAt(0).toUpperCase()}</Text></Pressable>
        </View>

        <View style={styles.welcomeRow}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>SECURITY DESK</Text>
            <Text style={styles.title}>Good to see you,{`\n`}{user?.name?.split(' ')[0] ?? 'Guard'}.</Text>
            <Text style={styles.gate}>{user?.gate ?? 'Main Gate'}</Text>
          </View>
          <View style={styles.dutyChip}><View style={styles.dutyDot} /><Text style={styles.dutyText}>{user?.shift ? SHIFT_LABEL[user.shift] : 'On duty'}</Text></View>
        </View>

        {pendingCount > 0 && (
          <Pressable style={styles.notice} onPress={() => open('/approvals')}>
            <View style={styles.noticeIcon}><Ionicons name="time-outline" size={20} color={GuardColors.black} /></View>
            <View style={styles.noticeCopy}><Text style={styles.noticeTitle}>{pendingCount} visitor{pendingCount === 1 ? '' : 's'} waiting</Text><Text style={styles.noticeText}>Review resident approvals</Text></View>
            <Ionicons name="arrow-forward" size={19} color={GuardColors.black} />
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Gate operations</Text>
        <View style={styles.primaryRow}>
          <Pressable style={[styles.primary, styles.primaryDark]} onPress={() => open('/new-entry', true)}>
            <View style={styles.darkIcon}><Ionicons name="person-add-outline" size={25} color={GuardColors.gold} /></View>
            <Text style={styles.primaryDarkTitle}>New entry</Text><Text style={styles.primaryDarkText}>Register a visitor</Text>
            <View style={styles.arrowDark}><Ionicons name="arrow-forward" size={18} color={GuardColors.black} /></View>
          </Pressable>
          <Pressable style={[styles.primary, styles.primaryGold]} onPress={() => open('/scan-verify')}>
            <View style={styles.goldIcon}><Ionicons name="qr-code-outline" size={25} color={GuardColors.black} /></View>
            <Text style={styles.primaryTitle}>Scan pass</Text><Text style={styles.primaryText}>Verify QR access</Text>
            <View style={styles.arrowLight}><Ionicons name="arrow-forward" size={18} color={GuardColors.card} /></View>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <Pressable key={item.route} style={styles.quickTile} onPress={() => open(item.route)}>
              <View style={[styles.quickIcon, item.route === '/approvals' && styles.quickIconGold]}>
                <Ionicons name={item.icon} size={23} color={item.route === '/approvals' ? GuardColors.goldDeep : GuardColors.t1} />
              </View>
              <Text style={styles.quickTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{item.label}</Text>
              <Text style={styles.quickText} numberOfLines={1}>{item.detail}</Text>
              {item.route === '/approvals' && pendingCount > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{pendingCount}</Text></View>}
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.emergency} onPress={() => open('/emergencies', true)}>
          <View style={styles.emergencyIcon}><Ionicons name="warning-outline" size={24} color={GuardColors.red} /></View>
          <View style={styles.emergencyCopy}><Text style={styles.emergencyTitle}>Emergency assistance</Text><Text style={styles.emergencyText}>Alert your society response team</Text></View>
          <View style={styles.emergencyArrow}><Ionicons name="arrow-forward" size={18} color={GuardColors.card} /></View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GuardColors.bg }, content: { paddingHorizontal: 20, paddingTop: 12 },
  topbar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: GuardColors.ink, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: GuardColors.gold, fontFamily: GuardFonts.bold, fontSize: 17, fontWeight: '800' },
  welcomeRow: { marginTop: 27, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, welcomeCopy: { flex: 1 }, eyebrow: { color: GuardColors.goldDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 }, title: { marginTop: 8, color: GuardColors.t1, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8 }, gate: { marginTop: 8, color: GuardColors.t2, fontSize: 14, fontWeight: '600' },
  dutyChip: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GuardColors.greenBg, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 99 }, dutyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GuardColors.green }, dutyText: { color: GuardColors.green, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  notice: { marginTop: 22, minHeight: 66, borderRadius: GuardRadius.lg, backgroundColor: GuardColors.gold, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, noticeIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' }, noticeCopy: { flex: 1, marginLeft: 12 }, noticeTitle: { color: GuardColors.black, fontSize: 14, fontWeight: '900' }, noticeText: { marginTop: 2, color: '#5E4900', fontSize: 11, fontWeight: '600' },
  sectionTitle: { marginTop: 27, marginBottom: 12, color: GuardColors.t1, fontSize: 17, fontWeight: '900', letterSpacing: -0.2 }, sectionLabel: { marginTop: 28, marginBottom: 14, color: GuardColors.t3, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, primaryRow: { flexDirection: 'row', justifyContent: 'space-between' }, primary: { width: '48.3%', height: 176, borderRadius: 24, padding: 16, overflow: 'hidden' }, primaryDark: { backgroundColor: GuardColors.ink, borderWidth: 1, borderColor: GuardColors.ink }, primaryGold: { backgroundColor: GuardColors.goldPale, borderWidth: 1, borderColor: '#EAD58D' }, darkIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#2B2F3A', alignItems: 'center', justifyContent: 'center' }, goldIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' }, primaryDarkTitle: { marginTop: 21, color: GuardColors.card, fontSize: 18, fontWeight: '900' }, primaryTitle: { marginTop: 21, color: GuardColors.t1, fontSize: 18, fontWeight: '900' }, primaryDarkText: { marginTop: 4, color: '#A7ABB5', fontSize: 12, fontWeight: '600' }, primaryText: { marginTop: 4, color: GuardColors.t2, fontSize: 12, fontWeight: '600' }, arrowDark: { position: 'absolute', right: 14, bottom: 14, width: 32, height: 32, borderRadius: 11, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' }, arrowLight: { position: 'absolute', right: 14, bottom: 14, width: 32, height: 32, borderRadius: 11, backgroundColor: GuardColors.ink, alignItems: 'center', justifyContent: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, quickTile: { width: '48.3%', minHeight: 126, borderRadius: 18, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.borderSoft, padding: 14, justifyContent: 'flex-end' }, quickIcon: { position: 'absolute', left: 14, top: 14, width: 42, height: 42, borderRadius: 13, backgroundColor: GuardColors.surface, alignItems: 'center', justifyContent: 'center' }, quickIconGold: { backgroundColor: GuardColors.goldPale }, quickTitle: { color: GuardColors.t1, fontSize: 13, fontWeight: '900' }, quickText: { marginTop: 3, color: GuardColors.t3, fontSize: 10, fontWeight: '500' }, countBadge: { position: 'absolute', right: 12, top: 12, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, countText: { color: GuardColors.black, fontSize: 11, fontWeight: '900' },
  emergency: { marginTop: 18, minHeight: 86, borderRadius: 20, borderWidth: 1, borderColor: '#F3CECE', backgroundColor: GuardColors.redBg, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }, emergencyIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center' }, emergencyCopy: { flex: 1, marginLeft: 12, paddingRight: 8 }, emergencyTitle: { color: GuardColors.red, fontSize: 14, fontWeight: '900' }, emergencyText: { marginTop: 3, color: '#9B5454', fontSize: 11, lineHeight: 15, fontWeight: '600' }, emergencyArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: GuardColors.red, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
