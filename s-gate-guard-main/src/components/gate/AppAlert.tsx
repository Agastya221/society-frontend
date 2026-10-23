import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GuardColors, GuardFonts, GuardGradients, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';

export type AppAlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void | Promise<void> };
type AlertRequest = { title: string; message?: string; buttons: AppAlertButton[] };

let queue: AlertRequest[] = [];
let wake: (() => void) | null = null;

/**
 * The app's own dialog instead of the grey Android system box. Same arguments as Alert.alert;
 * a button without text reads "OK" in the guard's language. Needs <AppAlertHost /> mounted once.
 */
export const AppAlert = {
  show(title: string, message?: string, buttons?: AppAlertButton[]) {
    queue = [...queue, { title, message, buttons: buttons?.length ? buttons : [{}] }];
    wake?.();
  },
};

/** Shows queued dialogs one at a time, big buttons stacked, the action first and "keep / cancel" last. */
export function AppAlertHost() {
  const t = useT();
  const [current, setCurrent] = useState<AlertRequest | null>(null);

  useEffect(() => {
    wake = () => setCurrent((shown) => shown ?? queue[0] ?? null);
    wake();
    return () => { wake = null; };
  }, []);

  if (!current) return null;

  const close = (button?: AppAlertButton) => {
    queue = queue.slice(1);
    setCurrent(queue[0] ?? null);
    button?.onPress?.();
  };
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  // Phone Back = the cancel choice; a lone "OK" counts as cancel.
  const onBack = () => close(cancel ?? (current.buttons.length === 1 ? current.buttons[0] : undefined));
  const ordered = [...current.buttons.filter((b) => b.style !== 'cancel'), ...current.buttons.filter((b) => b.style === 'cancel')];
  const single = ordered.length === 1;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onBack}>
      <View style={S.backdrop}>
        <View style={S.card}>
          <Text style={S.title}>{current.title}</Text>
          {current.message ? <Text style={S.message}>{current.message}</Text> : null}
          <View style={S.buttons}>
            {ordered.map((button, i) => {
              const label = button.text ?? t('common.ok');
              const quiet = button.style === 'cancel' && !single;
              const colors = button.style === 'destructive' ? GuardGradients.deny : single ? GuardGradients.dark : GuardGradients.gold;
              return quiet ? (
                <TouchableOpacity key={i} accessibilityRole="button" activeOpacity={0.8} style={[S.button, S.quiet]} onPress={() => close(button)}>
                  <Text style={[S.label, { color: GuardColors.t1 }]}>{label}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity key={i} accessibilityRole="button" activeOpacity={0.85} onPress={() => close(button)}>
                  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.button}>
                    <Text style={[S.label, { color: button.style === 'destructive' || single ? '#FFFFFF' : GuardColors.black }]}>{label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,15,20,0.55)', justifyContent: 'center', padding: 22 },
  card: { backgroundColor: GuardColors.card, borderRadius: 30, padding: 24, ...guardShadow('#0D0F14', 3) },
  title: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 26, fontWeight: '900' },
  message: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 18, lineHeight: 26, marginTop: 10 },
  buttons: { gap: 10, marginTop: 24 },
  button: { minHeight: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  quiet: { backgroundColor: GuardColors.surface, borderWidth: 1, borderColor: GuardColors.border },
  label: { fontFamily: GuardFonts.bold, fontSize: 20, fontWeight: '900' },
});
