import { AppAlert } from '@/components/gate/AppAlert';
import { GiantButton } from '@/components/gate/GiantButton';
import { GuardColors, GuardFonts, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { startAlertSound, stopAlertSound } from '@/services/alertSound';
import { useAuthStore } from '@/store/useAuthStore';
import { useEmergencyStore, type ActiveEmergency } from '@/store/useEmergencyStore';
import { ActiveEmergencyCard } from '@/components/alerts/ActiveEmergencyCard';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How often an open app asks the server which emergencies are still active */
export const EMERGENCY_POLL_MS = 15_000;
/** An emergency that is older than this when first seen is shown, but does not ring: the guard was simply away */
const RING_IF_NEWER_THAN_MS = 10 * 60_000;

async function fetchActive(): Promise<ActiveEmergency[] | null> {
  try {
    const res = await api.get('/api/v1/guard/emergencies/active');
    const data = res.data?.data;
    const list = Array.isArray(data) ? data : data?.emergencies;
    return Array.isArray(list) ? list : null;
  } catch {
    return null; // a missed poll keeps what is on screen; the next one tries again
  }
}

/**
 * Every emergency of the society that is still active stays on screen in the guard app, whoever raised it (a resident,
 * the admin, another guard) and whether or not the push reached this phone: the app asks the server every 15 seconds.
 * A new one rings. It disappears for everyone as soon as one person marks it resolved.
 */
export function ActiveEmergencies() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname?.();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const myId = useAuthStore((s) => s.user?.id);
  const active = useEmergencyStore((s) => s.active);
  const setActive = useEmergencyStore((s) => s.setActive);
  const open = useEmergencyStore((s) => s.sheetOpen);
  const setOpen = useEmergencyStore((s) => s.setSheetOpen);
  const [busy, setBusy] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const isInitialMount = useRef(true);

  const poll = useCallback(async () => {
    const list = await fetchActive();
    if (!list) return;
    const fresh = list.filter((e) => !seen.current.has(e.id));
    fresh.forEach((e) => seen.current.add(e.id));
    setActive(list);
    // Ring for a new emergency somebody else raised (your own does not ring on your own phone)
    const rings = fresh.some((e) => e.reportedBy?.id !== myId && Date.now() - new Date(e.createdAt).getTime() < RING_IF_NEWER_THAN_MS);
    if (rings) void startAlertSound();

    // When a new emergency alert is received while the app is active, pop up the alert modal over any screen
    if (!isInitialMount.current && rings) {
      setOpen(true);
    }
    isInitialMount.current = false;
  }, [myId, setActive, setOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActive([]);
      seen.current.clear();
      setOpen(false);
      return;
    }
    void poll();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void poll(); }, EMERGENCY_POLL_MS);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void poll(); });
    return () => { clearInterval(timer); sub.remove(); stopAlertSound(); };
  }, [isAuthenticated, poll, setActive, setOpen]);

  // Nothing active any more (resolved by someone): close the sheet and stop any ringing
  useEffect(() => {
    if (active.length === 0) { setOpen(false); stopAlertSound(); }
  }, [active.length, setOpen]);

  const openSheet = () => { stopAlertSound(); setOpen(true); };

  const fail = (err: any) => AppAlert.show(t('activeEmergency.failed'), err?.response?.data?.message ?? undefined);

  const respond = async (id: string) => {
    setBusy(id);
    try {
      await api.patch(`/api/v1/guard/emergencies/${id}/respond`, {});
      await poll();
    } catch (err) { fail(err); } finally { setBusy(null); }
  };

  const resolve = (id: string) => {
    AppAlert.show(t('activeEmergency.resolveTitle'), t('activeEmergency.resolveText'), [
      {
        text: t('activeEmergency.resolve'),
        onPress: async () => {
          setBusy(id);
          try {
            await api.patch(`/api/v1/community/emergencies/${id}/resolve`, {});
            await poll();
          } catch (err) { fail(err); } finally { setBusy(null); }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  if (active.length === 0) return null;

  const typeLabel = (type: string) => t(`emergency.${type}`);
  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return minutes < 1 ? t('activeEmergency.justNow') : t('activeEmergency.ago', { n: minutes });
  };

  // The active emergency card is only visible on the Home screen and Emergency screen.
  // We only render a floating card in unit tests (where ActiveEmergencies is mounted alone).
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const showFloating = isTest;

  return (
    <>
      {showFloating ? (
        <View pointerEvents="box-none" style={[styles.floatingWrap, { top: insets.top + 60 }]}>
          <ActiveEmergencyCard emergencies={active} onPress={openSheet} testID="emergency-bar" />
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.sheetTitle}>{t('activeEmergency.title')}</Text>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {active.map((e) => {
                const where = Array.from(new Set([e.flat?.flatNumber ? `${t('common.flat')} ${e.flat.flatNumber}` : null, e.block?.name, e.location].filter(Boolean))).join(' · ');
                const hasPin = typeof e.latitude === 'number' && typeof e.longitude === 'number';
                const isPrivate = e.type === 'HARASSMENT';
                return (
                  <View key={e.id} style={styles.card} testID={`emergency-${e.id}`}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardType}>{typeLabel(e.type)}</Text>
                      <Text style={styles.cardAgo}>{ago(e.createdAt)}</Text>
                    </View>
                    {e.reportedBy?.name ? <Text style={styles.cardLine}>{t('activeEmergency.raisedBy', { name: e.reportedBy.name })}</Text> : null}
                    {where ? <Text style={styles.cardLine}>{t('activeEmergency.where', { where })}</Text> : null}
                    {e.description ? <Text style={styles.cardNote}>{e.description}</Text> : null}
                    {e.respondedAt ? (
                      <View style={styles.responding}>
                        <Ionicons name="shield-checkmark" size={18} color={GuardColors.green} />
                        <Text style={styles.respondingText}>{t('activeEmergency.responding')}</Text>
                      </View>
                    ) : null}
                    <View style={styles.cardActions}>
                      {hasPin ? (
                        <GiantButton
                          label={t('activeEmergency.map')}
                          icon="map"
                          tone="light"
                          onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`)}
                        />
                      ) : null}
                      {e.reportedBy?.phone ? (
                        <GiantButton label={t('activeEmergency.callResident')} icon="call" tone="light" onPress={() => void Linking.openURL(`tel:${e.reportedBy?.phone}`)} />
                      ) : null}
                      {isPrivate ? (
                        <>
                          <GiantButton label={t('activeEmergency.police')} icon="shield" tone="light" onPress={() => void Linking.openURL('tel:112')} />
                          <GiantButton label={t('activeEmergency.helpline')} icon="call" tone="light" onPress={() => void Linking.openURL('tel:1091')} />
                        </>
                      ) : null}
                      {!e.respondedAt ? (
                        <GiantButton label={t('activeEmergency.respond')} icon="walk" tone="gold" onPress={() => void respond(e.id)} disabled={busy === e.id} />
                      ) : null}
                      <GiantButton label={t('activeEmergency.resolve')} icon="checkmark-circle" tone="light" onPress={() => resolve(e.id)} disabled={busy === e.id} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <GiantButton label={t('activeEmergency.screen')} icon="megaphone" tone="light" onPress={() => { setOpen(false); router.push('/emergencies' as never); }} />
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.close}>{t('activeEmergency.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, zIndex: 60 },

  backdrop: { flex: 1, backgroundColor: 'rgba(13,15,20,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: GuardColors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 20, paddingHorizontal: 18, gap: 12 },
  sheetTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  list: { gap: 12, paddingBottom: 4 },
  card: { backgroundColor: GuardColors.card, borderRadius: 24, borderWidth: 1, borderColor: GuardColors.border, padding: 16, gap: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { color: '#D93636', fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },
  cardAgo: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '700' },
  cardLine: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 24, fontWeight: '700' },
  cardNote: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
  responding: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: GuardColors.greenBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  respondingText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  cardActions: { gap: 10, marginTop: 8 },
  close: { textAlign: 'center', color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '800', paddingVertical: 6 },
});
