import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../constants/theme';

export type AppAlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void | Promise<void> };
type AlertRequest = { title: string; message?: string; buttons: AppAlertButton[] };

let queue: AlertRequest[] = [];
let wake: (() => void) | null = null;

/**
 * The app's own dialog instead of the grey Android system box. Same arguments as Alert.alert
 * (a button without text reads "OK"). Needs <AppAlertHost /> mounted once at the root.
 */
export const AppAlert = {
  show(title: string, message?: string, buttons?: AppAlertButton[]) {
    queue = [...queue, { title, message, buttons: buttons?.length ? buttons : [{}] }];
    wake?.();
  },
};

/** Shows queued dialogs one at a time: "keep / cancel" on the left, the action on the right. */
export function AppAlertHost() {
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
  const ordered = [...current.buttons.filter((b) => b.style === 'cancel'), ...current.buttons.filter((b) => b.style !== 'cancel')];

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onBack}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>{current.title}</Text>
          {current.message ? <Text style={s.message}>{current.message}</Text> : null}
          <View style={s.buttons}>
            {ordered.map((button, i) => {
              const quiet = button.style === 'cancel' && ordered.length > 1;
              const danger = button.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() => close(button)}
                  style={({ pressed }) => [s.button, quiet ? s.quiet : danger ? s.danger : s.primary, pressed && s.pressed]}
                >
                  <Text style={[s.label, quiet && s.quietLabel, danger && s.dangerLabel]}>{button.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,21,29,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, shadowColor: Colors.ink, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.ink },
  message: { fontSize: 15, lineHeight: 22, color: Colors.muted, marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 22 },
  button: { flex: 1, minHeight: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primary: { backgroundColor: Colors.gold },
  danger: { backgroundColor: Colors.red },
  quiet: { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border },
  pressed: { opacity: 0.8 },
  label: { fontSize: 15, fontWeight: '900', color: Colors.ink },
  quietLabel: { color: Colors.muted },
  dangerLabel: { color: '#FFFFFF' },
});
