import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import * as Haptics from 'expo-haptics';

export default function ResidentAllToolsScreen() {
    const router = useRouter();
    const [showPreApprove, setShowPreApprove] = useState(false);

    type Tool = {
        icon: keyof typeof Feather.glyphMap;
        title: string;
        bg: string;
        color: string;
        route: string;
    };

    const essentialTools: Tool[] = [
        { icon: 'user-check' as const,     title: 'Pre-Approve',     bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: 'MODAL' },
        { icon: 'credit-card' as const,    title: 'My Passes',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(resident)/my-passes' },
        { icon: 'package' as const,        title: 'Expect Delivery', bg: SgateColors.surface,   color: SgateColors.t2,       route: '/expect-delivery' },
        { icon: 'alert-triangle' as const, title: 'SOS Alert',       bg: SgateColors.redBg,     color: SgateColors.red,      route: '/(resident)/emergency/create' },
    ];

    const communityTools: Tool[] = [
        { icon: 'message-circle' as const, title: 'Community',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(resident)/communication' },
        { icon: 'book-open' as const,      title: 'Local Directory', bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(resident)/local-directory' },
        { icon: 'users' as const,          title: 'Daily Help',      bg: SgateColors.greenBg,   color: SgateColors.green,    route: '/(resident)/daily-help' },
        { icon: 'calendar' as const,       title: 'Amenities',       bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(resident)/amenities' },
        { icon: 'bar-chart-2' as const,    title: 'Polls',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(resident)/elections' },
        { icon: 'folder' as const,         title: 'Documents',       bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(resident)/documents' },
        { icon: 'bell' as const,           title: 'Notices',         bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(resident)/notices' }
    ];

    const personalTools: Tool[] = [
        { icon: 'credit-card' as const,    title: 'Society Dues',    bg: SgateColors.redBg,     color: SgateColors.red,      route: '/(resident)/society-dues' },
        { icon: 'truck' as const,          title: 'My Vehicles',     bg: SgateColors.surface,   color: SgateColors.t2,       route: '/(resident)/vehicles' },
        { icon: 'search' as const,         title: 'Search Vehicle',  bg: SgateColors.goldPale,  color: SgateColors.goldDeep, route: '/(resident)/search-vehicle' },
        { icon: 'settings' as const,       title: 'Complaints',      bg: SgateColors.blueBg,    color: SgateColors.blue,     route: '/(resident)/complaints' }
    ];

    const nav = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (route === 'MODAL') {
            setShowPreApprove(true);
        } else {
            router.push(route as any);
        }
    };

    const renderGrid = (tools: typeof essentialTools) => (
        <View style={styles.grid}>
            {tools.map((t, idx) => (
                <TouchableOpacity key={idx} style={styles.tile} onPress={() => nav(t.route)}>
                    <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                        <Feather name={t.icon} size={22} color={t.color} />
                    </View>
                    <Text style={styles.tileTitle}>{t.title}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Tools</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>ESSENTIALS</Text>
                {renderGrid(essentialTools)}

                <Text style={styles.sectionTitle}>SOCIETY & COMMUNITY</Text>
                {renderGrid(communityTools)}

                <Text style={styles.sectionTitle}>PERSONAL</Text>
                {renderGrid(personalTools)}
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
    scrollContent: { padding: 20, paddingBottom: 60 },
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
        justifyContent: 'flex-start',
        gap: '2%',
        rowGap: 16,
        marginBottom: 20,
    },
    tile: {
        width: '32%',
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
        width: 44, height: 44,
        borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    tileTitle: {
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        textAlign: 'center',
    },
});
