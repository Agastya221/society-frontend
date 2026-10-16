import { GuardColors, GuardFonts, GuardTouch } from '@/constants/theme';
import { useT } from '@/i18n';
import { toEnglishName } from '@/utils/englishName';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert } from '@/components/gate/AppAlert';

type SpeechPackage = typeof import('expo-speech-recognition');
type Subscription = { remove: () => void };

/** Speech is loaded when tapped so older development builds still allow typing. */
export function VoiceNameInput({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const t = useT();
  const [listening, setListening] = useState(false);
  const [preview, setPreview] = useState('');
  const speechRef = useRef<SpeechPackage['ExpoSpeechRecognitionModule'] | null>(null);
  const subscriptions = useRef<Subscription[]>([]);

  const clearListeners = () => {
    subscriptions.current.forEach((subscription) => subscription.remove());
    subscriptions.current = [];
  };

  useEffect(() => () => {
    clearListeners();
    try { speechRef.current?.abort(); } catch { /* recognition may already have ended */ }
  }, []);

  const toggleSpeech = async () => {
    if (listening) {
      speechRef.current?.stop();
      return;
    }
    try {
      const speech = await import('expo-speech-recognition');
      const module = speech.ExpoSpeechRecognitionModule;
      if (!module.isRecognitionAvailable()) throw new Error('Speech recognition unavailable');
      const permission = await module.requestPermissionsAsync();
      if (!permission.granted) {
        AppAlert.show(t('visitor.voiceUnavailable'), t('visitor.voicePermission'));
        return;
      }
      clearListeners();
      speechRef.current = module;
      setPreview('');
      subscriptions.current = [
        module.addListener('start', () => setListening(true)),
        module.addListener('end', () => { setListening(false); setPreview(''); clearListeners(); }),
        module.addListener('result', (event) => {
          const transcript = toEnglishName(event.results[0]?.transcript ?? '');
          if (!transcript) return;
          if (event.isFinal) { onChange(transcript); setPreview(''); }
          else setPreview(transcript);
        }),
        module.addListener('error', (event) => {
          setListening(false);
          setPreview('');
          if (event.error !== 'aborted') AppAlert.show(t('visitor.voiceUnavailable'), t('visitor.voiceTryTyping'));
        }),
      ];
      // Names are stored in English letters for both Hindi and English UI.
      module.start({ lang: 'en-IN', interimResults: true, continuous: false });
    } catch {
      setListening(false);
      clearListeners();
      AppAlert.show(t('visitor.voiceUnavailable'), t('visitor.voiceTryTyping'));
    }
  };

  return (
    <View>
      <Text style={styles.label}>{t('visitor.nameLabel')}</Text>
      <View style={styles.row}>
        <TextInput
          testID="visitor-name"
          style={styles.input}
          placeholder={t('visitor.namePlaceholder')}
          placeholderTextColor={GuardColors.t3}
          value={value}
          onChangeText={onChange}
          onEndEditing={() => onChange(toEnglishName(value))}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="done"
        />
        <Pressable
          testID="speak-name"
          accessibilityRole="button"
          accessibilityLabel={t(listening ? 'visitor.stopListening' : 'visitor.speakName')}
          onPress={toggleSpeech}
          style={[styles.mic, listening && styles.micActive]}
        >
          <Ionicons name={listening ? 'stop' : 'mic'} size={26} color={listening ? '#FFFFFF' : GuardColors.t1} />
        </Pressable>
      </View>
      {listening ? <Text style={styles.hint}>{preview || t('visitor.listening')}</Text> : null}
      {value ? <Text style={styles.hint}>{t('visitor.confirmName')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: GuardTouch.min, borderRadius: 18, borderWidth: 1, borderColor: GuardColors.border, backgroundColor: GuardColors.card, paddingHorizontal: 16, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 20 },
  mic: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: GuardColors.gold },
  micActive: { backgroundColor: GuardColors.red },
  hint: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 15, marginTop: 6 },
});
