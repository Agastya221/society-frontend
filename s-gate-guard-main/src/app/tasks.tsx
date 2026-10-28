import { AppAlert } from '@/components/gate/AppAlert';
import { GiantButton } from '@/components/gate/GiantButton';
import { HomeButton } from '@/components/gate/HomeButton';
import { GuardColors, GuardFonts, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How often the open screen asks the server for the tasks again */
export const TASK_POLL_MS = 20_000;

interface Task {
  id: string;
  title: string;
  note?: string | null;
  location?: string | null;
  block?: { id: string; name: string } | null;
  status: 'ASSIGNED' | 'ACCEPTED' | 'DONE' | 'CANCELLED';
  createdAt: string;
  domesticStaff: { id: string; name: string; phone?: string; staffType: string };
}
interface Staff { id: string; name: string; phone?: string; staffType: string; insideNow: boolean }
interface Places { blocks: { id: string; name: string }[]; commonAreas: string[] }

const QUICK = ['tasks.quick1', 'tasks.quick2', 'tasks.quick3', 'tasks.quick4', 'tasks.quick5'];
const typeLabel = (type: string) => type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');

export default function TasksScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [sheet, setSheet] = useState(false);
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [places, setPlaces] = useState<Places | null>(null);
  const [pickedStaff, setPickedStaff] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState<{ blockId?: string; location?: string } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/guard/staff-tasks', { params: { scope: 'all' } });
      const rows = res?.data?.data;
      if (Array.isArray(rows)) { setTasks(rows); setFailed(false); } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, TASK_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  const openSheet = async () => {
    setSheet(true);
    if (!staff) {
      try {
        const res = await api.get('/api/v1/guard/staff-tasks/staff');
        setStaff(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch { setStaff([]); }
    }
    if (!places) {
      try {
        const res = await api.get('/api/v1/community/emergencies/places');
        const d = res?.data?.data;
        if (d && Array.isArray(d.blocks)) setPlaces({ blocks: d.blocks, commonAreas: Array.isArray(d.commonAreas) ? d.commonAreas : [] });
      } catch { /* picking a place is optional */ }
    }
  };

  const closeSheet = () => { setSheet(false); setPickedStaff(null); setTitle(''); setPlace(null); setNote(''); };

  const give = async () => {
    if (sending || !pickedStaff || title.trim().length < 2) return;
    setSending(true);
    try {
      await api.post('/api/v1/guard/staff-tasks', {
        domesticStaffId: pickedStaff,
        title: title.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(place?.blockId ? { blockId: place.blockId } : {}),
        ...(place?.location ? { location: place.location } : {}),
      });
      const name = staff?.find((s) => s.id === pickedStaff)?.name ?? '';
      closeSheet();
      await load();
      AppAlert.show(t('tasks.given'), t('tasks.givenText', { name }));
    } catch (err: any) {
      AppAlert.show(t('tasks.givenFailed'), err?.response?.data?.message ?? undefined);
    } finally {
      setSending(false);
    }
  };

  const cancel = (task: Task) => {
    AppAlert.show(t('tasks.cancelTitle'), t('tasks.cancelText'), [
      {
        text: t('tasks.cancel'),
        style: 'destructive',
        onPress: async () => {
          try { await api.patch(`/api/v1/guard/staff-tasks/${task.id}/cancel`, {}); await load(); }
          catch (err: any) { AppAlert.show(t('tasks.givenFailed'), err?.response?.data?.message ?? undefined); void load(); }
        },
      },
      { text: t('tasks.keep'), style: 'cancel' },
    ]);
  };

  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return t('tasks.justNow');
    if (minutes < 60) return t('tasks.ago', { n: minutes });
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
  };
  const statusText = (task: Task) => {
    const name = task.domesticStaff.name;
    return task.status === 'ASSIGNED' ? t('tasks.waiting', { name })
      : task.status === 'ACCEPTED' ? t('tasks.accepted', { name })
        : task.status === 'DONE' ? t('tasks.done', { name }) : t('tasks.cancelled');
  };

  const open = tasks.filter((x) => x.status === 'ASSIGNED' || x.status === 'ACCEPTED');
  const closed = tasks.filter((x) => x.status === 'DONE' || x.status === 'CANCELLED');

  const card = (task: Task) => {
    const where = [task.block?.name, task.location].filter(Boolean).join(' · ');
    const isOpen = task.status === 'ASSIGNED' || task.status === 'ACCEPTED';
    const tone = task.status === 'DONE' ? styles.toneDone : task.status === 'ACCEPTED' ? styles.toneAccepted : task.status === 'CANCELLED' ? styles.toneCancelled : styles.toneWaiting;
    return (
      <View key={task.id} style={styles.card} testID={`task-${task.id}`}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{task.title}</Text>
          <Text style={styles.cardAgo}>{ago(task.createdAt)}</Text>
        </View>
        {where ? <Text style={styles.cardWhere}>{where}</Text> : null}
        <View style={[styles.status, tone]}><Text style={styles.statusText}>{statusText(task)}</Text></View>
        <Text style={styles.cardStaff}>{task.domesticStaff.name} · {typeLabel(task.domesticStaff.staffType)}</Text>
        {task.note ? <Text style={styles.cardNote}>{task.note}</Text> : null}
        {isOpen ? (
          <View style={styles.cardActions}>
            {task.domesticStaff.phone ? (
              <Pressable testID={`call-${task.id}`} accessibilityRole="button" style={styles.smallBtn} onPress={() => void Linking.openURL(`tel:${task.domesticStaff.phone}`)}>
                <Ionicons name="call" size={18} color={GuardColors.t1} /><Text style={styles.smallBtnText}>{t('tasks.call')}</Text>
              </Pressable>
            ) : null}
            <Pressable testID={`cancel-${task.id}`} accessibilityRole="button" style={styles.smallBtn} onPress={() => cancel(task)}>
              <Ionicons name="close-circle" size={18} color={GuardColors.t1} /><Text style={styles.smallBtnText}>{t('tasks.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <GiantButton label={t('tasks.give')} icon="add-circle" tone="gold" onPress={() => void openSheet()} />

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={GuardColors.goldDeep} /><Text style={styles.centeredText}>{t('tasks.loading')}</Text></View>
        ) : failed && tasks.length === 0 ? (
          <View style={[styles.empty]}>
            <Ionicons name="alert-circle-outline" size={44} color={GuardColors.t3} />
            <Text style={styles.centeredText}>{t('tasks.failed')}</Text>
            <GiantButton label={t('tasks.retry')} icon="refresh" tone="light" onPress={() => void load()} />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={44} color={GuardColors.t3} />
            <Text style={styles.centeredText}>{t('tasks.empty')}</Text>
            <Text style={styles.emptySub}>{t('tasks.emptySub')}</Text>
          </View>
        ) : (
          <>
            {open.length ? <Text style={styles.section}>{t('tasks.open')}</Text> : null}
            {open.map(card)}
            {closed.length ? <Text style={styles.section}>{t('tasks.closed')}</Text> : null}
            {closed.map(card)}
          </>
        )}
      </ScrollView>
      <HomeButton />

      <Modal visible={sheet} transparent animationType="slide" statusBarTranslucent onRequestClose={closeSheet}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.sheetTitle}>{t('tasks.sheetTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('tasks.pickStaff')}</Text>
              {staff === null ? <ActivityIndicator color={GuardColors.goldDeep} /> : staff.length === 0 ? (
                <Text style={styles.emptySub}>{t('tasks.noStaff')}</Text>
              ) : staff.map((s) => (
                <Pressable key={s.id} testID={`staff-${s.id}`} accessibilityRole="button" accessibilityState={{ selected: pickedStaff === s.id }} onPress={() => setPickedStaff(pickedStaff === s.id ? null : s.id)} style={[styles.staffRow, pickedStaff === s.id && styles.staffRowOn]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{s.name}</Text>
                    <Text style={styles.staffType}>{typeLabel(s.staffType)}{s.insideNow ? ` · ${t('tasks.inside')}` : ''}</Text>
                  </View>
                  {pickedStaff === s.id ? <Ionicons name="checkmark-circle" size={26} color={GuardColors.green} /> : null}
                </Pressable>
              ))}

              <Text style={styles.label}>{t('tasks.what')}</Text>
              <View style={styles.chips}>
                {QUICK.map((key) => (
                  <Pressable key={key} testID={`quick-${key}`} accessibilityRole="button" onPress={() => setTitle(t(key).trim())} style={[styles.chip, title === t(key).trim() && styles.chipOn]}>
                    <Text style={[styles.chipText, title === t(key).trim() && styles.chipTextOn]}>{t(key)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput testID="task-title" value={title} onChangeText={setTitle} placeholder={t('tasks.whatPlaceholder')} placeholderTextColor={GuardColors.t4} style={styles.input} maxLength={120} />

              {places && (places.blocks.length || places.commonAreas.length) ? (
                <>
                  <Text style={styles.label}>{t('tasks.where')}</Text>
                  <View style={styles.chips}>
                    {places.blocks.map((b) => {
                      const on = place?.blockId === b.id;
                      return (
                        <Pressable key={b.id} testID={`place-block-${b.id}`} accessibilityRole="button" onPress={() => setPlace(on ? null : { blockId: b.id })} style={[styles.chip, on && styles.chipOn]}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                        </Pressable>
                      );
                    })}
                    {places.commonAreas.map((a) => {
                      const on = place?.location === a;
                      return (
                        <Pressable key={a} testID={`place-area-${a}`} accessibilityRole="button" onPress={() => setPlace(on ? null : { location: a })} style={[styles.chip, on && styles.chipOn]}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>{t('tasks.note')}</Text>
              <TextInput testID="task-note" value={note} onChangeText={setNote} placeholder="" style={[styles.input, styles.noteInput]} multiline maxLength={500} />
            </ScrollView>
            <GiantButton label={t('tasks.assign')} icon="paper-plane" tone="gold" disabled={sending || !pickedStaff || title.trim().length < 2} onPress={() => void give()} />
            <Pressable accessibilityRole="button" onPress={closeSheet} hitSlop={12}><Text style={styles.close}>{t('tasks.close')}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GuardColors.bg },
  content: { padding: 20, gap: 14, paddingBottom: 28 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 24 },
  centeredText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  emptySub: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  section: { color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 22, fontWeight: '800', letterSpacing: 0.6, marginTop: 6 },

  card: { backgroundColor: GuardColors.card, borderRadius: 24, borderWidth: 1, borderColor: GuardColors.border, padding: 16, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },
  cardAgo: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '700' },
  cardWhere: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 24, fontWeight: '700' },
  status: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  toneWaiting: { backgroundColor: GuardColors.goldPale },
  toneAccepted: { backgroundColor: GuardColors.blueBg },
  toneDone: { backgroundColor: GuardColors.greenBg },
  toneCancelled: { backgroundColor: GuardColors.surface },
  cardStaff: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
  cardNote: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  smallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: 16, backgroundColor: GuardColors.surface },
  smallBtnText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 16, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(13,15,20,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: GuardColors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 20, paddingHorizontal: 18, gap: 12 },
  sheetTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  sheetBody: { gap: 10, paddingBottom: 6 },
  label: { color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 22, fontWeight: '800', letterSpacing: 0.4, marginTop: 6 },
  staffRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: GuardColors.card, borderRadius: 18, borderWidth: 2, borderColor: GuardColors.border, padding: 14 },
  staffRowOn: { borderColor: GuardColors.green, backgroundColor: GuardColors.greenBg },
  staffName: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body + 2, lineHeight: 26, fontWeight: '800' },
  staffType: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 20, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: GuardColors.border, backgroundColor: GuardColors.card },
  chipOn: { backgroundColor: GuardColors.goldPale, borderColor: GuardColors.gold },
  chipText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 15, fontWeight: '700' },
  chipTextOn: { color: GuardColors.t1 },
  input: { backgroundColor: GuardColors.card, borderRadius: 16, borderWidth: 1, borderColor: GuardColors.border, paddingHorizontal: 14, paddingVertical: 12, color: GuardColors.t1, fontFamily: GuardFonts.medium, fontSize: GuardType.body },
  noteInput: { minHeight: 70, textAlignVertical: 'top' },
  close: { textAlign: 'center', color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '800', paddingVertical: 6 },
});
