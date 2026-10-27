import { GiantButton } from '@/components/gate/GiantButton';
import { HomeButton } from '@/components/gate/HomeButton';
import { LiveDot } from '@/components/gate/LiveDot';
import { GuardColors, GuardFonts, GuardSemantic, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Shift {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  endedBy: string | null;
  minutes: number;
  onDuty: boolean;
  lateMinutes: number;
  earlyMinutes: number;
}

interface MyMonth {
  month: string;
  daysPresent: number;
  totalMinutes: number;
  lateCount: number;
  earlyCount: number;
  onDutyNow: boolean;
  scheduledShift: { name: string; startTime: string; endTime: string } | null;
  shifts: Shift[];
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function MyAttendanceScreen() {
  const t = useT();
  const thisMonth = monthKey(new Date());
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<MyMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get('/api/v1/guard/attendance/me', { params: { month: key } });
      setData(res.data?.data ?? null);
      if (!res.data?.data) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(month); }, [load, month]);

  const duration = (minutes: number) => t('attendance.hm', { h: Math.floor(minutes / 60), m: minutes % 60 });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthBar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={26} color={GuardColors.t1} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthLabel(month)}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={month >= thisMonth}
            onPress={() => setMonth(shiftMonth(month, 1))}
            style={[styles.monthBtn, month >= thisMonth && styles.monthBtnOff]}
          >
            <Ionicons name="chevron-forward" size={26} color={GuardColors.t1} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={GuardColors.goldDeep} />
            <Text style={styles.centeredText}>{t('attendance.loading')}</Text>
          </View>
        ) : failed || !data ? (
          <View style={[styles.card, styles.centered]}>
            <Ionicons name="alert-circle-outline" size={44} color={GuardColors.t3} />
            <Text style={styles.centeredText}>{t('attendance.failed')}</Text>
            <GiantButton label={t('attendance.retry')} icon="refresh" tone="gold" onPress={() => void load(month)} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('attendance.shift')}</Text>
              {data.scheduledShift ? (
                <View style={styles.shiftRow}>
                  <Ionicons name="time" size={30} color={GuardColors.goldDeep} />
                  <View style={styles.shiftCopy}>
                    <Text style={styles.shiftName}>{data.scheduledShift.name}</Text>
                    <Text style={styles.shiftTimes}>{data.scheduledShift.startTime} – {data.scheduledShift.endTime}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.muted}>{t('attendance.noShift')}</Text>
              )}
              {data.onDutyNow ? (
                <View style={styles.liveChip}>
                  <LiveDot color={GuardSemantic.allow} size={8} />
                  <Text style={styles.liveText}>{t('attendance.onDutyNow')}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stats}>
              <Stat value={String(data.daysPresent)} label={t('attendance.days')} />
              <Stat value={(data.totalMinutes / 60).toFixed(1)} label={t('attendance.hours')} />
              <Stat value={String(data.lateCount)} label={t('attendance.late')} warn={data.lateCount > 0} />
              <Stat value={String(data.earlyCount)} label={t('attendance.early')} warn={data.earlyCount > 0} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('attendance.history')}</Text>
              {data.shifts.length === 0 ? (
                <Text style={styles.muted}>{t('attendance.empty')}</Text>
              ) : (
                [...data.shifts].reverse().map((shift, index) => (
                  <View key={shift.id} style={[styles.shift, index > 0 && styles.shiftBorder]}>
                    <View style={styles.shiftTop}>
                      <Text style={styles.shiftDay}>{dayLabel(shift.startedAt)}</Text>
                      <Text style={styles.shiftLength}>{shift.onDuty ? t('attendance.running') : duration(shift.minutes)}</Text>
                    </View>
                    <Text style={styles.shiftWhen}>
                      {clock(shift.startedAt)} – {shift.endedAt ? clock(shift.endedAt) : '…'}
                      {shift.endedBy === 'AUTO' ? `  ·  ${t('attendance.autoClosed')}` : ''}
                    </Text>
                    {shift.lateMinutes > 0 || shift.earlyMinutes > 0 ? (
                      <View style={styles.flags}>
                        {shift.lateMinutes > 0 ? <Flag text={t('attendance.lateBy', { n: shift.lateMinutes })} /> : null}
                        {shift.earlyMinutes > 0 ? <Flag text={t('attendance.earlyBy', { n: shift.earlyMinutes })} /> : null}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            <Text style={styles.note}>{t('attendance.gateNote')}</Text>
          </>
        )}
      </ScrollView>
      <HomeButton activeTab="profile" />
    </View>
  );
}

function Stat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && styles.statWarn]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function Flag({ text }: { text: string }) {
  return (
    <View style={styles.flag}>
      <Ionicons name="warning" size={15} color={GuardSemantic.denyBg} />
      <Text style={styles.flagText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GuardColors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 110 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 24 },
  centeredText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800', textAlign: 'center' },

  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { width: 52, height: 52, borderRadius: 18, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center' },
  monthBtnOff: { opacity: 0.35 },
  monthText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },

  card: { backgroundColor: GuardColors.card, borderRadius: 28, borderWidth: 1, borderColor: GuardColors.border, padding: 18, gap: 14 },
  cardLabel: { color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 22, fontWeight: '800', letterSpacing: 0.6 },
  muted: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '600' },

  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shiftCopy: { flex: 1 },
  shiftName: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },
  shiftTimes: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body + 2, lineHeight: 28, fontWeight: '700' },
  liveChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GuardColors.greenBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  liveText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 22, fontWeight: '800' },

  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: GuardColors.card, borderRadius: 22, borderWidth: 1, borderColor: GuardColors.border, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
  statValue: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  statWarn: { color: GuardSemantic.denyBg },
  statLabel: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },

  shift: { gap: 4 },
  shiftBorder: { borderTopWidth: 1, borderTopColor: GuardColors.borderSoft, paddingTop: 14 },
  shiftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftDay: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body + 2, lineHeight: 28, fontWeight: '800' },
  shiftLength: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
  shiftWhen: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GuardColors.redBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  flagText: { color: GuardSemantic.denyBg, fontFamily: GuardFonts.bold, fontSize: 14, lineHeight: 20, fontWeight: '800' },

  note: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
});
