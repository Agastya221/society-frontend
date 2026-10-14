import { GiantButton } from '@/components/gate/GiantButton';
import { Pressy } from '@/components/gate/Pressy';
import { ResultScreen } from '@/components/gate/ResultScreen';
import { GuardColors, GuardFonts, GuardSemantic, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EmergencyType = {
    apiType: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    /** Sent to the server as the alert description (kept in English: residents' phones show it). */
    description: string;
};

// Most urgent first. The api types are exactly the ones the server already accepts.
const EMERGENCIES: EmergencyType[] = [
    { apiType: 'MEDICAL',       icon: 'medkit',            color: '#DC2626', bg: '#FEE2E2', description: 'Medical emergency or injury' },
    { apiType: 'FIRE',          icon: 'flame',             color: '#EA580C', bg: '#FFEDD5', description: 'Fire outbreak or smoke detected' },
    { apiType: 'SECURITY',      icon: 'shield-checkmark',  color: '#DC2626', bg: '#FEE2E2', description: 'Security threat or breach' },
    { apiType: 'VIOLENCE',      icon: 'warning',           color: '#DC2626', bg: '#FEE2E2', description: 'Violence or physical threat' },
    { apiType: 'THEFT',         icon: 'lock-open',         color: '#7C3AED', bg: '#EDE9FE', description: 'Theft or attempted theft' },
    { apiType: 'ACCIDENT',      icon: 'car-sport',         color: '#EA580C', bg: '#FFEDD5', description: 'Accident inside the society' },
    { apiType: 'LIFT_STUCK',    icon: 'swap-vertical',     color: '#2563EB', bg: '#DBEAFE', description: 'Person trapped in elevator' },
    { apiType: 'ANIMAL_THREAT', icon: 'paw',               color: '#B7791F', bg: '#FFF7D6', description: 'Dangerous animal in society' },
    { apiType: 'OTHER',         icon: 'ellipsis-horizontal-circle', color: '#4B5563', bg: '#F3F4F6', description: 'Other urgent emergency' },
];

const COOLDOWN_SECONDS = 15;

export default function EmergenciesScreen() {
    const t = useT();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [raising, setRaising] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    // One more press to confirm, after the 2 second hold that opened this screen.
    const [confirm, setConfirm] = useState<EmergencyType | null>(null);
    const [sent, setSent] = useState<{ type: string; time: Date } | null>(null);
    // A second tap can land before `raising` re-renders; the ref blocks it.
    const raisingRef = useRef(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (cooldown > 0) timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [cooldown]);

    // Android back closes the confirm card first, then leaves.
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (raising) return true;
            if (confirm) { setConfirm(null); return true; }
            return false;
        });
        return () => sub.remove();
    }, [confirm, raising]);

    const raiseEmergency = async (emergency: EmergencyType) => {
        if (cooldown > 0 || raising || raisingRef.current) return;
        raisingRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRaising(emergency.apiType);
        try {
            await api.post('/api/v1/community/emergencies', {
                type: emergency.apiType,
                description: emergency.description,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCooldown(COOLDOWN_SECONDS);
            setConfirm(null);
            setSent({ type: t(`emergency.${emergency.apiType}`), time: new Date() });
        } catch (err: any) {
            setConfirm(null);
            Alert.alert(t('emergency.failed'), err?.response?.data?.message ?? t('emergency.failedText'));
        } finally {
            raisingRef.current = false;
            setRaising(null);
        }
    };

    if (sent) {
        return (
            <ResultScreen
                kind="deny"
                icon="megaphone"
                title={t('emergency.sentTitle')}
                reason={t('emergency.sentText')}
                name={sent.type}
                flat={t('emergency.sentAt', { time: sent.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })}
                primaryLabel={t('common.home')}
                onPrimary={() => router.replace('/')}
            />
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} testID="emergency-back" style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={26} color={GuardColors.t1} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{t('emergency.title')}</Text>
                    <Text style={styles.sub}>{t('emergency.sub')}</Text>
                </View>
                <View style={styles.headerIcon}><Ionicons name="warning" size={26} color={GuardSemantic.deny} /></View>
            </View>

            <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
                {EMERGENCIES.map((e) => {
                    const onCooldown = cooldown > 0;
                    return (
                        <Pressy
                            key={e.apiType}
                            wrapStyle={styles.tileWrap}
                            testID={`emergency-${e.apiType}`}
                            accessibilityLabel={t(`emergency.${e.apiType}`)}
                            disabled={onCooldown || !!raising}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setConfirm(e); }}
                            style={[styles.tile, guardShadow('#0D0F14', 1), onCooldown && styles.tileOff]}
                        >
                            <View style={[styles.tileIcon, { backgroundColor: onCooldown ? GuardColors.surface : e.bg }]}>
                                <Ionicons name={e.icon} size={38} color={onCooldown ? GuardColors.t3 : e.color} />
                            </View>
                            <Text style={[styles.tileLabel, onCooldown && { color: GuardColors.t3 }]} numberOfLines={2}>{t(`emergency.${e.apiType}`)}</Text>
                            {onCooldown && <Text style={styles.cooldown}>{t('emergency.cooldown', { n: cooldown })}</Text>}
                        </Pressy>
                    );
                })}
            </ScrollView>

            {confirm && (
                <Animated.View entering={FadeIn.duration(180)} style={styles.dim}>
                    <Animated.View entering={FadeInDown.duration(260)} style={[styles.sheet, guardShadow('#000000', 3), { paddingBottom: insets.bottom + 16 }]}>
                        <View style={[styles.sheetIcon, { backgroundColor: confirm.bg }]}>
                            <Ionicons name={confirm.icon} size={44} color={confirm.color} />
                        </View>
                        <Text style={styles.sheetTitle}>{t('emergency.confirmTitle')}</Text>
                        <Text style={styles.sheetText}>{t('emergency.confirmText', { type: t(`emergency.${confirm.apiType}`) })}</Text>
                        <GiantButton label={t('emergency.send')} icon="megaphone" tone="deny" loading={!!raising} onPress={() => raiseEmergency(confirm)} />
                        <TouchableOpacity testID="emergency-cancel" activeOpacity={0.7} disabled={!!raising} onPress={() => setConfirm(null)} style={styles.cancel}>
                            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
    backBtn: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', ...guardShadow('#0D0F14', 1) },
    title: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
    sub: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
    headerIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: GuardColors.redBg, alignItems: 'center', justifyContent: 'center' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, paddingTop: 6 },
    tileWrap: { width: '47.6%' },
    tile: { minHeight: 150, borderRadius: 28, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 14 },
    tileOff: { opacity: 0.7 },
    tileIcon: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    tileLabel: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
    cooldown: { position: 'absolute', top: 10, right: 12, color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 20, fontWeight: '800' },

    dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: GuardColors.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 22, gap: 12, alignItems: 'stretch' },
    sheetIcon: { alignSelf: 'center', width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { textAlign: 'center', color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 28, lineHeight: 36, fontWeight: '900' },
    sheetText: { textAlign: 'center', color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '600', marginBottom: 6 },
    cancel: { minHeight: GuardTouch.button - 8, alignItems: 'center', justifyContent: 'center' },
    cancelText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
});
