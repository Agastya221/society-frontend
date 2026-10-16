import { GiantButton } from '@/components/gate/GiantButton';
import { HomeButton } from '@/components/gate/HomeButton';
import { LanguageSwitch } from '@/components/gate/LanguageSwitch';
import { LiveDot } from '@/components/gate/LiveDot';
import { GuardColors, GuardFonts, GuardGradients, GuardSemantic, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Society {
    name: string;
    address: string;
    city: string;
    state?: string;
    pincode?: string;
}

interface GuardProfile {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    lastLogin?: string;
    society?: Society;
    createdAt?: string;
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
        <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name={icon} size={24} color={GuardColors.goldDeep} /></View>
            <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
            </View>
        </View>
    );
}

export default function ProfileScreen() {
    const t = useT();
    const { logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<GuardProfile | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    // Fetch latest profile from API
    useEffect(() => {
        api.get('/api/v1/auth/guard-app/profile')
            .then((res) => {
                const u = res.data?.data;
                if (!u) return;
                setProfile({
                    name: u.name,
                    id: u.id,
                    phone: u.phone,
                    role: u.role,
                    isActive: u.isActive,
                    photoUrl: u.photoUrl,
                    lastLogin: u.lastLogin,
                    society: u.society,
                    createdAt: u.createdAt,
                });
            })
            .catch((err) => {
                console.warn('Failed to fetch profile', err?.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [reloadKey]);

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            t('profile.logoutTitle'),
            t('profile.logoutText'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        // Navigation handled by root layout
                    },
                },
            ]
        );
    };

    const languageCard = (
        <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('profile.language')}</Text>
            <LanguageSwitch />
        </View>
    );

    const logoutButton = (
        <GiantButton label={t('profile.logout')} icon="log-out-outline" tone="light" onPress={handleLogout} />
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={GuardColors.goldDeep} />
                <Text style={styles.centeredText}>{t('profile.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {profile ? (
                    <>
                        <LinearGradient colors={GuardGradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, guardShadow('#FFB300', 2)]}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{(profile.name ?? 'G').charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.name} numberOfLines={2}>{profile.name}</Text>
                            <Text style={styles.role}>{t('profile.guard')}</Text>
                            <View style={styles.dutyChip}>
                                {profile.isActive ? <LiveDot color={GuardSemantic.allow} size={8} /> : <Ionicons name="pause-circle" size={18} color={GuardColors.t2} />}
                                <Text style={styles.dutyText}>{(profile.isActive ? t('profile.onDuty') : t('profile.inactive')) + '\u00A0'}</Text>
                            </View>
                        </LinearGradient>

                        <View style={styles.card}>
                            <Row icon="call" label={t('profile.phone')} value={profile.phone} />
                            {profile.society?.name ? (
                                <Row icon="business" label={t('profile.society')} value={[profile.society.name, profile.society.city].filter(Boolean).join(', ')} />
                            ) : null}
                            {profile.lastLogin ? (
                                <Row
                                    icon="time"
                                    label={t('profile.lastLogin')}
                                    value={new Date(profile.lastLogin).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                />
                            ) : null}
                        </View>
                    </>
                ) : (
                    <View style={[styles.card, styles.errorCard]}>
                        <Ionicons name="alert-circle-outline" size={48} color={GuardColors.t3} />
                        <Text style={styles.errorText}>{t('profile.couldNotLoad')}</Text>
                        {/* A network blip shouldn't push the guard toward logging out — offer a retry first. */}
                        <TouchableOpacity activeOpacity={0.8} onPress={() => { setLoading(true); setReloadKey((k) => k + 1); }} style={styles.retry}>
                            <Text style={styles.retryText}>{t('profile.tryAgain')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {languageCard}
                {logoutButton}
            </ScrollView>
            <HomeButton />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },
    scrollContent: { padding: 20, gap: 16, paddingBottom: 28 },
    centered: { flex: 1, backgroundColor: GuardColors.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
    centeredText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },

    hero: { borderRadius: 34, backgroundColor: '#FFB800', padding: 24, alignItems: 'center', gap: 6 },
    avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    avatarText: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: 40, lineHeight: 50, fontWeight: '900' },
    name: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
    role: { color: 'rgba(60,40,0,0.78)', fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '700' },
    dutyChip: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 10, paddingRight: 16, paddingVertical: 4 },
    dutyText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 22, fontWeight: '800' },

    card: { backgroundColor: GuardColors.card, borderRadius: 28, borderWidth: 1, borderColor: GuardColors.border, padding: 18, gap: 16 },
    cardLabel: { color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 22, fontWeight: '800', letterSpacing: 0.6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    rowIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: GuardColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    rowCopy: { flex: 1 },
    rowLabel: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '600' },
    rowValue: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body + 2, lineHeight: 28, fontWeight: '800' },

    errorCard: { alignItems: 'center' },
    errorText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
    retry: { minHeight: GuardTouch.button - 8, paddingHorizontal: 28, borderRadius: 24, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },
});
