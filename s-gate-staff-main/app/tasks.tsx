import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppAlert } from '../src/components/AppAlert';
import { Colors, Radius } from '../src/constants/theme';
import { api } from '../src/services/api';
import { useTasksSignal } from '../src/store/tasksSignal';
import { StaffTask } from '../src/types/staff';

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
};
const where = (t: StaffTask) => [t.block?.name, t.location].filter(Boolean).join(' · ');
const giver = (t: StaffTask) => (t.createdBy ? `${t.createdBy.name}${t.createdBy.role === 'GUARD' ? ' (security)' : t.createdBy.role === 'ADMIN' ? ' (admin)' : ''}` : 'Security');

/** Jobs given by security or the admin: accept, then mark done. */
export default function Tasks() {
  const [items, setItems] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [acting, setActing] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const signal = useTasksSignal((s) => s.tick);

  const load = async () => {
    try { const r = await api.get('/staff-app/tasks'); setItems(r.data.data ?? []); setFailed(false); } catch { setFailed(true); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [signal]);
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  // A fast double tap fires twice before `acting` re-renders the buttons disabled
  const act = async (task: StaffTask, step: 'accept' | 'done') => {
    if (busy.current) return;
    busy.current = true;
    setActing(task.id);
    try { await api.patch(`/staff-app/tasks/${task.id}/${step}`); await load(); }
    catch (e: any) { AppAlert.show('Could not update the task', e.response?.data?.message || 'Please try again.'); load(); }
    finally { busy.current = false; setActing(undefined); }
  };

  const open = items.filter((t) => t.status === 'ASSIGNED' || t.status === 'ACCEPTED');
  const closed = items.filter((t) => t.status === 'DONE' || t.status === 'CANCELLED');

  const card = (t: StaffTask) => (
    <View style={s.card} key={t.id} testID={`task-${t.id}`}>
      <View style={s.top}>
        <View style={s.icon}><Ionicons name="checkbox-outline" size={22} color={Colors.ink} /></View>
        <View style={s.info}>
          <Text style={s.title}>{t.title}</Text>
          {where(t) ? <Text style={s.sub}>{where(t)}</Text> : null}
        </View>
        <View style={[s.badge, t.status === 'ACCEPTED' && s.accepted, t.status === 'DONE' && s.done, t.status === 'CANCELLED' && s.cancelled]}>
          <Text style={[s.badgeText, t.status === 'CANCELLED' && s.cancelledText]}>{t.status === 'ASSIGNED' ? 'NEW' : t.status}</Text>
        </View>
      </View>
      <Text style={s.meta}>From {giver(t)} · {ago(t.createdAt)}</Text>
      {t.note ? <Text style={s.note}>{t.note}</Text> : null}
      {t.status === 'ASSIGNED' || t.status === 'ACCEPTED' ? (
        <View style={s.actions}>
          {t.status === 'ASSIGNED' ? (
            <Pressable testID={`accept-${t.id}`} disabled={!!acting} style={s.accept} onPress={() => act(t, 'accept')} accessibilityRole="button">
              {acting === t.id ? <ActivityIndicator color={Colors.ink} /> : <Text style={s.acceptText}>Accept</Text>}
            </Pressable>
          ) : null}
          <Pressable testID={`done-${t.id}`} disabled={!!acting} style={s.finish} onPress={() => act(t, 'done')} accessibilityRole="button">
            <Text style={s.finishText}>Mark done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} colors={[Colors.gold]} />}>
      {loading ? <ActivityIndicator style={s.loader} color={Colors.gold} /> : items.length ? (
        <>
          {open.length ? <Text style={s.section}>TO DO</Text> : null}
          {open.map(card)}
          {closed.length ? <Text style={s.section}>FINISHED OR CANCELLED (LAST DAY)</Text> : null}
          {closed.map(card)}
        </>
      ) : (
        <View style={s.empty}>
          <View style={s.emptyIcon}><Ionicons name="checkbox-outline" size={35} color={Colors.soft} /></View>
          <Text style={s.emptyTitle}>{failed ? 'Could not load tasks' : 'No tasks'}</Text>
          <Text style={s.emptyText}>{failed ? 'Check your connection and pull down to try again.' : 'Jobs from security or the admin will appear here.'}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, flexGrow: 1 },
  loader: { marginTop: 60 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: Colors.soft, marginBottom: 10, marginTop: 6 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 17, marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 45, height: 45, borderRadius: 15, backgroundColor: Colors.goldPale, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '900', color: Colors.ink },
  sub: { fontSize: 12, color: Colors.muted, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: Colors.goldPale },
  accepted: { backgroundColor: Colors.bluePale },
  done: { backgroundColor: Colors.greenPale },
  cancelled: { backgroundColor: Colors.redPale },
  badgeText: { fontSize: 9, fontWeight: '900', color: Colors.ink },
  cancelledText: { color: Colors.red },
  meta: { fontSize: 12, fontWeight: '700', color: Colors.muted, marginTop: 14 },
  note: { fontSize: 13, lineHeight: 19, color: Colors.ink, backgroundColor: Colors.bg, padding: 12, borderRadius: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  accept: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  acceptText: { fontWeight: '900', color: Colors.ink },
  finish: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  finishText: { fontWeight: '900', color: Colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 38 },
  emptyIcon: { width: 74, height: 74, borderRadius: 24, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: Colors.ink, marginTop: 18 },
  emptyText: { fontSize: 13, lineHeight: 20, textAlign: 'center', color: Colors.muted, marginTop: 7 },
});
