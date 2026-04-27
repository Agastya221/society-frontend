import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import * as Haptics from 'expo-haptics';

export default function AllToolsScreen() {
    const router = useRouter();
    const [showPreApprove, setShowPreApprove] = useState(false);

    const adminTools = [
        { icon: 'briefcase-outline' as const,      title: 'Staff',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(admin)/staff' },
        { icon: 'bullhorn-outline' as const,       title: 'Broadcast',       bg: SgateColors.redBg,     color: SgateColors.red,      route: '/(admin)/broadcast' },
        { icon: 'clipboard-check-outline' as const,title: 'Gate Passes',    bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(admin)/gate-passes' },
        { icon: 'alert-circle-outline' as const,   title: 'Complaints',      bg: SgateColors.redBg,     color: SgateColors.red,      route: '/(admin)/complaints' },
        { icon: 'shield-outline' as const,         title: 'Guards',          bg: SgateColors.greenBg,   color: SgateColors.green,    route: '/(admin)/guards' },
        { icon: 'account-group-outline' as const,  title: 'Residents',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(admin)/onboarding-requests' },
        { icon: 'flash-outline' as const,          title: 'Emergencies',     bg: SgateColors.redBg,     color: SgateColors.red,      route: '/(admin)/emergencies' },
        { icon: 'message-outline' as const,        title: 'Community',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(admin)/community' },
        { icon: 'poll' as const,                   title: 'Polls',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(admin)/elections' },
        { icon: 'bell-outline' as const,           title: 'Notices',         bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(admin)/notices' },
        { icon: 'credit-card-outline' as const,    title: 'Payments',        bg: SgateColors.greenBg,   color: SgateColors.green,    route: '/(admin)/payments' },
        { icon: 'home-city-outline' as const,      title: 'Flats',           bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(admin)/flats' },
        { icon: 'car-outline' as const,            title: 'Vehicles',        bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(admin)/vehicles' },
        { icon: 'cog-outline' as const,            title: 'Settings',        bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(admin)/settings' },
    ];

    const personalTools = [
        { icon: 'account-check-outline' as const,  title: 'Pre-Approve',     bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: 'MODAL' },
        { icon: 'smart-card-outline' as const,     title: 'My Passes',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(admin)/my-passes' },
        { icon: 'receipt-text-outline' as const,    title: 'My Dues',         bg: SgateColors.greenBg,   color: SgateColors.green,    route: '/(admin)/my-dues' },
        { icon: 'package-variant' as const,         title: 'Expect Delivery', bg: SgateColors.surface,   color: SgateColors.t2,       route: '/expect-delivery' },
        { icon: 'car-outline' as const,             title: 'My Vehicles',     bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(admin)/my-home/vehicles' },
        { icon: 'coffee-outline' as const,          title: 'My Amenities',    bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(admin)/my-home/amenities' },
    ];

    const nav = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (route === 'MODAL') {
            setShowPreApprove(true);
        } else {
            router.push(route as any);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Admin Tools</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>ADMINISTRATION</Text>
                <View style={styles.grid}>
                    {adminTools.map((t, idx) => (
                        <TouchableOpacity key={idx} style={styles.tile} onPress={() => nav(t.route)}>
                            <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                                <MaterialCommunityIcons name={t.icon} size={26} color={t.color} />
                            </View>
                            <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>MY PERSONAL FLAT</Text>
                <View style={styles.grid}>
                    {personalTools.map((t, idx) => (
                        <TouchableOpacity key={idx} style={styles.tile} onPress={() => nav(t.route)}>
                            <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                                <MaterialCommunityIcons name={t.icon} size={26} color={t.color} />
                            </View>
                            <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <PreApproveSheet visible={showPreApprove} onClose={() => setShowPreApprove(false)} />
        </SafeAreaView>
    );
}

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
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionTitle: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1,
        marginBottom: 16,
        marginTop: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },
    tile: {
        width: '31%',
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
    },
    iconWrap: {
        width: 48, height: 48,
        borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    tileTitle: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        textAlign: 'center',
    },
});
