import { GiantButton } from '@/components/gate/GiantButton';
import { HomeButton } from '@/components/gate/HomeButton';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { GuardColors, GuardFonts, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { fetchRecentStopped, type QueueItem } from '@/services/gateQueue';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, AppState, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

const OVERRIDE_WAIT_MS = 45_000;
const POLL_MS = 3_000;

async function fetchStatus(status: 'PENDING' | 'APPROVED'): Promise<QueueItem[]> {
  const all: QueueItem[] = [];
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const query = `status=${status}&order=oldest&limit=100&page=${page}${status === 'APPROVED' ? '&awaitingEntry=true' : ''}`;
    const res = await api.get(`/api/v1/gate/entry-requests?${query}`);
    const data = res.data?.data;
    const rows: QueueItem[] = data?.entryRequests ?? [];
    all.push(...rows);
    pages = Math.min(data?.pagination?.pages ?? 1, 10);
    if (rows.length === 0) break;
    page++;
  }
  return [...new Map(all.map((item) => [item.id, item])).values()];
}

export default function ApprovalsScreen() {
  const t = useT();
  const [ready, setReady] = useState<QueueItem[]>([]);
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [stopped, setStopped] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false);
  const actioningRef = useRef(false);
  const knownReady = useRef<Set<string> | null>(null);
  const knownStopped = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [nextReady, nextPending, nextStopped] = await Promise.all([fetchStatus('APPROVED'), fetchStatus('PENDING'), fetchRecentStopped()]);
      if (knownReady.current && nextReady.some((item) => !knownReady.current!.has(item.id))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      knownReady.current = new Set(nextReady.map((item) => item.id));
      if (knownStopped.current && nextStopped.some((item) => !knownStopped.current!.has(item.id))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      knownStopped.current = new Set(nextStopped.map((item) => item.id));
      setReady(nextReady);
      setPending(nextPending);
      setStopped(nextStopped);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
    const poll = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]));

  const act = async (id: string, action: 'admit' | 'no-show' | 'approve' | 'reject') => {
    if (actioningRef.current) return;
    actioningRef.current = true;
    setActioning(`${id}:${action}`);
    try {
      await api.patch(`/api/v1/gate/entry-requests/${id}/${action}`);
      Haptics.notificationAsync(action === 'reject' || action === 'no-show'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success);
      await refresh();
    } catch (err: any) {
      Alert.alert(t('queue.changed'), err?.response?.data?.message ?? t('queue.tryAgain'));
      await refresh();
    } finally {
      actioningRef.current = false;
      setActioning(null);
    }
  };

  const confirm = (id: string, action: 'no-show' | 'reject') => {
    Alert.alert(t(action === 'no-show' ? 'queue.leftTitle' : 'queue.stopTitle'), t(action === 'no-show' ? 'queue.leftText' : 'queue.stopText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t(action === 'no-show' ? 'queue.left' : 'queue.stop'), style: 'destructive', onPress: () => act(id, action) },
    ]);
  };

  const rows: Array<{ kind: 'heading' | 'item'; section: 'ready' | 'pending' | 'stopped'; item?: QueueItem }> = [
    { kind: 'heading', section: 'ready' },
    ...ready.map((item) => ({ kind: 'item' as const, section: 'ready' as const, item })),
    { kind: 'heading', section: 'pending' },
    ...pending.map((item) => ({ kind: 'item' as const, section: 'pending' as const, item })),
    { kind: 'heading', section: 'stopped' },
    ...stopped.map((item) => ({ kind: 'item' as const, section: 'stopped' as const, item })),
  ];

  if (loading) return <ScreenLoading label={t('queue.loading')} />;

  return (
    <View style={styles.root}>
      {error ? <Text style={styles.error}>{t('queue.networkError')}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(row, index) => row.kind === 'heading' ? row.section : row.item?.id ?? String(index)}
        renderItem={({ item: row }) => row.kind === 'heading'
          ? <Text style={styles.heading}>{t(row.section === 'ready' ? 'queue.ready' : row.section === 'pending' ? 'queue.waiting' : 'queue.stopped')} · {row.section === 'ready' ? ready.length : row.section === 'pending' ? pending.length : stopped.length}</Text>
          : <QueueCard
              item={row.item!}
              now={now}
              busy={!!actioning}
              actioning={actioning}
              onAdmit={() => act(row.item!.id, 'admit')}
              onNoShow={() => confirm(row.item!.id, 'no-show')}
              onOverride={() => act(row.item!.id, 'approve')}
              onStop={() => confirm(row.item!.id, 'reject')}
            />}
        ListEmptyComponent={<ScreenEmpty icon="checkmark-done-circle-outline" title={t('queue.empty')} message={t('queue.emptyText')} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} tintColor={GuardColors.goldDeep} />}
      />
      <HomeButton />
    </View>
  );
}

function QueueCard({ item, now, busy, actioning, onAdmit, onNoShow, onOverride, onStop }: {
  item: QueueItem; now: number; busy: boolean; actioning: string | null;
  onAdmit: () => void; onNoShow: () => void; onOverride: () => void; onStop: () => void;
}) {
  const t = useT();
  const ready = item.status === 'APPROVED';
  const stopped = item.status === 'REJECTED' || item.status === 'EXPIRED';
  const elapsed = Math.max(0, now - new Date(item.createdAt).getTime());
  const remaining = Math.max(0, Math.ceil((OVERRIDE_WAIT_MS - elapsed) / 1000));
  const flat = item.flatLabel || item.flat?.number || '—';
  const type = ({ VISITOR: t('common.guest'), DELIVERY: t('common.delivery'), CAB: t('common.cab'), DOMESTIC_STAFF: t('common.help'), VENDOR: t('common.service') } as Record<string, string>)[item.type] ?? item.type;
  return (
    <View style={[styles.card, ready && styles.readyCard, stopped && styles.stoppedCard]}>
      <View style={styles.titleRow}>
        <View style={[styles.icon, { backgroundColor: ready ? GuardColors.greenBg : stopped ? GuardColors.redBg : GuardColors.goldPale }]}>
          <Ionicons name={ready ? 'checkmark-circle' : stopped ? 'close-circle' : 'time'} size={29} color={ready ? GuardColors.green : stopped ? GuardColors.red : GuardColors.goldDeep} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={styles.name} numberOfLines={1}>{item.visitorName || type}</Text>
          <Text style={styles.detail} numberOfLines={2}>{type}{item.providerTag ? ` · ${item.providerTag}` : ''}{item.purpose ? ` · ${item.purpose}` : ''} · {t('common.flat')} {flat}</Text>
        </View>
      </View>
      <Text style={styles.age}>{ready ? t('queue.approved') : stopped ? t('queue.stopped') : t('queue.awaitingResident')} · {Math.floor(elapsed / 60_000)} {t('queue.minutes')}</Text>
      {stopped && item.rejectionReason ? <Text style={styles.stoppedReason}>{item.rejectionReason}</Text> : null}
      {ready ? (
        <View style={styles.actions}>
          <GiantButton label={t('queue.admit')} icon="checkmark-circle" tone="allow" loading={actioning === `${item.id}:admit`} disabled={busy} onPress={onAdmit} />
          <GiantButton label={t('queue.left')} icon="close-circle" tone="light" disabled={busy} onPress={onNoShow} />
        </View>
      ) : stopped ? null : (
        <View style={styles.actions}>
          <Text style={styles.waitNote}>{remaining > 0 ? t('queue.overrideIn', { n: remaining }) : t('queue.noAnswer')}</Text>
          <GiantButton label={t('queue.override')} icon="checkmark-circle" tone="light" loading={actioning === `${item.id}:approve`} disabled={busy || remaining > 0} onPress={onOverride} />
          <GiantButton label={t('queue.stop')} icon="close-circle" tone="deny" disabled={busy} onPress={onStop} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GuardColors.bg },
  list: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 120, gap: 12 },
  heading: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 23, marginTop: 16, marginBottom: 2 },
  card: { backgroundColor: GuardColors.card, borderRadius: 26, padding: 18, gap: 13, borderWidth: 1, borderColor: GuardColors.border },
  readyCard: { borderWidth: 2, borderColor: GuardColors.green },
  stoppedCard: { borderWidth: 2, borderColor: GuardColors.red },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1 },
  name: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 24 },
  detail: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.body, marginTop: 3 },
  age: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 15 },
  actions: { gap: 9 },
  waitNote: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 16 },
  stoppedReason: { color: GuardColors.red, fontFamily: GuardFonts.bold, fontSize: 17 },
  error: { color: GuardColors.red, fontFamily: GuardFonts.bold, fontSize: 16, paddingHorizontal: 20, paddingTop: 12 },
});
