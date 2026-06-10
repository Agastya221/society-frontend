import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';

function getParam(value: string | string[] | undefined, fallback = '') {
    if (Array.isArray(value)) return value[0] ?? fallback;
    return value ?? fallback;
}

function formatResidentType(type: string, isLivingHere: string) {
    if (type === 'TENANT') return 'Tenant';
    if (type === 'OWNER' && isLivingHere === 'false') return 'Non-residing owner';
    if (type === 'OWNER') return 'Owner - Living here';
    return type || '-';
}

export default function AddFlatStatusScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const society = getParam(params.society, 'Selected society');
    const block = getParam(params.block, '-');
    const flat = getParam(params.flat, '-');
    const residentType = getParam(params.residentType, '-');
    const isLivingHere = getParam(params.isLivingHere, 'true');
    const submittedAt = getParam(params.submittedAt);
    const returnTo = getParam(params.returnTo, '/(resident)/profile');

    const submittedText = submittedAt
        ? new Date(submittedAt).toLocaleDateString()
        : 'Just now';

    const goBack = () => {
        router.replace(returnTo as any);
    };

    return (
        <View style={S.root}>
            <StatusBar style="dark" />

            <View style={[S.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={S.backBtn} onPress={goBack} hitSlop={8}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={S.headerTitle}>Flat Request</Text>
                <View style={S.headerSpacer} />
            </View>

            <View style={S.content}>
                <Animated.View entering={FadeInDown.delay(80).springify()} style={S.hero}>
                    <View style={S.iconWrap}>
                        <MaterialCommunityIcons name="clock-check-outline" size={42} color="#996300" />
                    </View>
                    <Text style={S.title}>Request Under Review</Text>
                    <Text style={S.subtitle}>
                        Your flat request has been sent to the society admin. You can keep using your current flat while this is reviewed.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(160).springify()} style={S.card}>
                    <InfoRow label="Society" value={society} />
                    <InfoRow label="Block / Tower" value={block} />
                    <InfoRow label="Flat" value={flat} />
                    <InfoRow label="Type" value={formatResidentType(residentType, isLivingHere)} />
                    <InfoRow label="Submitted" value={submittedText} isLast />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(240).springify()} style={S.note}>
                    <Feather name="info" size={15} color={SgateColors.t3} />
                    <Text style={S.noteText}>
                        This flat will appear in your switcher as pending now. It becomes switchable after admin approval.
                    </Text>
                </Animated.View>
            </View>

            <View style={[S.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
                <TouchableOpacity style={S.primaryBtn} onPress={goBack} activeOpacity={0.82}>
                    <Text style={S.primaryBtnText}>Back to My Flats</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function InfoRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
    return (
        <View style={[S.infoRow, !isLast && S.infoDivider]}>
            <Text style={S.infoLabel}>{label}</Text>
            <Text style={S.infoValue} numberOfLines={2}>{value}</Text>
        </View>
    );
}

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    headerSpacer: {
        width: 42,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 34,
    },
    hero: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrap: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    title: {
        fontSize: 24,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 21,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        ...SgateShadows.minimal,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 16,
    },
    infoDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: SgateColors.borderSoft,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    infoValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    note: {
        flexDirection: 'row',
        gap: 9,
        marginTop: 18,
        paddingHorizontal: 4,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 18,
    },
    bottomBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    primaryBtn: {
        height: 54,
        borderRadius: 18,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
});
