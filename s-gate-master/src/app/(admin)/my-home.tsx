import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Section data ─────────────────────────────────────────────────────────────
const VISITOR_ACTIONS = [
    { title: 'Pre-Approve',  icon: 'user-check' as const, id: 'pre-approve',  bg: SgateColors.goldPale,  iconColor: SgateColors.goldDeep },
    { title: 'My Passes',    icon: 'shield'     as const, id: 'my-passes',    bg: SgateColors.blueBg,    iconColor: SgateColors.blue },
];

const FLAT_ACTIONS = [
    { title: 'My Dues',      icon: 'credit-card' as const, id: 'dues',      bg: SgateColors.greenBg,   iconColor: SgateColors.green },
    { title: 'SOS Alert',    icon: 'alert-triangle' as const, id: 'sos',    bg: SgateColors.redBg,     iconColor: SgateColors.red },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyHomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [showPreApprove, setShowPreApprove] = useState(false);

    const flatLabel = user?.flat
        ? `${user.flat.block?.name ?? ''} · ${user.flat.number}`
        : null;

    const handleAction = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (id === 'pre-approve') { setShowPreApprove(true); return; }
        if (id === 'my-passes')  { router.push('/(admin)/my-passes'); return; }
        if (id === 'dues')       { router.push('/(admin)/my-dues'); return; }
        if (id === 'sos')        { /* future */ return; }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Home</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                    {/* ── Flat badge ────────────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.flatBadgeWrap}>
                        <View style={styles.flatBadge}>
                            <Feather name="home" size={14} color={SgateColors.goldDeep} style={{ marginRight: 6 }} />
                            <Text style={styles.flatBadgeText}>{flatLabel ?? 'Your Flat'}</Text>
                        </View>
                        <Text style={styles.flatSubText}>{user?.society?.name ?? 'Your Society'}</Text>
                    </Animated.View>

                    {/* ── Visitors & Passes ─────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(60).springify()}>
                        <Text style={styles.sectionLabel}>VISITORS & PASSES</Text>
                        <View style={styles.actionsGrid}>
                            {VISITOR_ACTIONS.map(a => (
                                <ActionTile
                                    key={a.id}
                                    title={a.title}
                                    icon={a.icon}
                                    bg={a.bg}
                                    iconColor={a.iconColor}
                                    onPress={() => handleAction(a.id)}
                                />
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── My Flat ───────────────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(120).springify()}>
                        <Text style={styles.sectionLabel}>MY FLAT</Text>
                        <View style={styles.actionsGrid}>
                            {FLAT_ACTIONS.map(a => (
                                <ActionTile
                                    key={a.id}
                                    title={a.title}
                                    icon={a.icon}
                                    bg={a.bg}
                                    iconColor={a.iconColor}
                                    onPress={() => handleAction(a.id)}
                                />
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Info banner ───────────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.infoBanner}>
                        <Feather name="info" size={14} color={SgateColors.blue} style={{ marginRight: 8, marginTop: 1 }} />
                        <Text style={styles.infoBannerText}>
                            As a society manager you also have full resident privileges. Use these features for your personal flat.
                        </Text>
                    </Animated.View>

                    <View style={{ height: 40 }} />
                </ScrollView>

            <PreApproveSheet
                visible={showPreApprove}
                onClose={() => setShowPreApprove(false)}
            />
        </SafeAreaView>
    );
}

// ─── Action tile ──────────────────────────────────────────────────────────────
function ActionTile({ title, icon, bg, iconColor, onPress }: {
    title: string; icon: keyof typeof Feather.glyphMap;
    bg: string; iconColor: string; onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.tileIcon, { backgroundColor: bg }]}>
                <Feather name={icon} size={22} color={iconColor} />
            </View>
            <Text style={styles.tileTitle}>{title}</Text>
            <Text style={styles.tileSub}>Manage</Text>
        </TouchableOpacity>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        flex: 1, textAlign: 'center',
        fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1,
    },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: 20, paddingHorizontal: 20 },

    // Flat badge
    flatBadgeWrap: { marginBottom: 24 },
    flatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.goldPale,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 6,
    },
    flatBadgeText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    flatSubText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, paddingLeft: 4 },

    // Section
    sectionLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        marginBottom: 12,
        marginTop: 4,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },

    // Tile
    tile: {
        width: '47.5%',
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        minHeight: 120,
    },
    tileIcon: {
        width: 48, height: 48,
        borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    tileTitle: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    tileSub: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

    // Info banner
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: SgateColors.blueBg,
        borderRadius: 16,
        padding: 14,
        marginTop: 4,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.blue,
        lineHeight: 18,
    },

    // No flat
    noFlatContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    noFlatIcon: {
        width: 72, height: 72,
        borderRadius: 24,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    noFlatTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    noFlatSubtitle: {
        fontSize: 13, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, textAlign: 'center', lineHeight: 20,
    },
});
