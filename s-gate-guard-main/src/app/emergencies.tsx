import { ResultScreen } from '@/components/gate/ResultScreen';
import { AppBottomNav } from '@/components/navigation/BottomNavBar';
import { GuardColors, GuardFonts, GuardSemantic, GuardTouch, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getFreshReading } from '@/services/location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '@/components/gate/AppAlert';

type EmergencyType = {
    apiType: string;
    icon: React.ComponentProps<typeof MaterialIcons>['name'];
    color: string;
    bg: string;
    /** Sent to the server as the alert description (kept in English: residents' phones show it). */
    description: string;
};

// 9 categories arranged consistently with s-gate-master
const EMERGENCIES: EmergencyType[] = [
    { apiType: 'HARASSMENT',    icon: 'woman',                 color: '#EF4444', bg: '#FCE7F3', description: 'Woman being harassed or abused' },
    { apiType: 'MEDICAL',       icon: 'medical-services',      color: '#EF4444', bg: '#FEE2E2', description: 'Medical emergency or injury' },
    { apiType: 'FIRE',          icon: 'local-fire-department', color: '#EF4444', bg: '#FFEDD5', description: 'Fire outbreak or smoke detected' },
    { apiType: 'SECURITY',      icon: 'security',              color: '#EF4444', bg: '#FEF3C7', description: 'Security threat or breach' },
    { apiType: 'LIFT_STUCK',    icon: 'elevator',              color: '#EF4444', bg: '#DBEAFE', description: 'Person trapped in elevator' },
    { apiType: 'ANIMAL_THREAT', icon: 'pets',                  color: '#EF4444', bg: '#FFFBEB', description: 'Dangerous animal in society' },
    { apiType: 'THEFT',         icon: 'lock-open',             color: '#EF4444', bg: '#EDE9FE', description: 'Theft or attempted theft' },
    { apiType: 'VIOLENCE',      icon: 'report-problem',        color: '#EF4444', bg: '#FEE2E2', description: 'Violence or physical threat' },
    { apiType: 'ACCIDENT',      icon: 'car-crash',             color: '#EF4444', bg: '#FFEDD5', description: 'Accident inside the society' },
    { apiType: 'OTHER',         icon: 'more-horiz',            color: '#EF4444', bg: '#F3F4F6', description: 'Other urgent emergency' },
];

const COOLDOWN_SECONDS = 15;

interface SocietyEmergency {
    id: string;
    type: string;
    status: string;
    description?: string;
    location?: string;
    createdAt: string;
    resolvedAt?: string;
    respondedAt?: string;
    respondedById?: string | null;
    respondedBy?: { id?: string; name: string; phone?: string; role?: string } | null;
    resolvedById?: string | null;
    resolvedBy?: { id?: string; name?: string; phone?: string; role?: string } | null;
    resolutionNote?: string;
    notes?: string;
    flat?: { flatNumber?: string; number?: string };
    reportedBy?: { name?: string; phone?: string };
}

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
};

export default function EmergenciesScreen() {
    const t = useT();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [raising, setRaising] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [confirm, setConfirm] = useState<EmergencyType | null>(null);
    const [sent, setSent] = useState<{ type: string; time: Date } | null>(null);
    const raisingRef = useRef(false);

    // The towers and common areas the guard can pick as "where it is happening" (loaded once, when first needed)
    const [places, setPlaces] = useState<{ blocks: { id: string; name: string }[]; commonAreas: string[] } | null>(null);
    const [pickedPlace, setPickedPlace] = useState<{ blockId?: string; location?: string } | null>(null);

    // Show Alerts Modal State
    const [alertsVisible, setAlertsVisible] = useState(false);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsList, setAlertsList] = useState<SocietyEmergency[]>([]);
    const [alertsFilter, setAlertsFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

    // Siren oscillating animation matching s-gate-master
    const sirenRotate = useSharedValue(0);

    useEffect(() => {
        sirenRotate.value = withRepeat(
            withSequence(
                withTiming(10, { duration: 150 }),
                withTiming(-10, { duration: 150 })
            ),
            -1,
            true
        );
    }, [sirenRotate]);

    const sirenStyle = useAnimatedStyle(() => ({
        transform: [{ rotateZ: `${sirenRotate.value}deg` }],
    }));

    useEffect(() => {
        if (!confirm || places) return;
        (async () => {
            try {
                const res = await api.get('/api/v1/community/emergencies/places');
                const data = res?.data?.data;
                if (data && Array.isArray(data.blocks)) {
                    setPlaces({ blocks: data.blocks, commonAreas: Array.isArray(data.commonAreas) ? data.commonAreas : [] });
                }
            } catch {
                // Picking a place is optional: the alarm still goes without it
            }
        })();
    }, [confirm, places]);

    useEffect(() => {
        if (!confirm) setPickedPlace(null);
    }, [confirm]);

    // Cooldown timer
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (cooldown > 0) {
            timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [cooldown]);

    // Android back closes modals first
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (raising) return true;
            if (alertsVisible) { setAlertsVisible(false); return true; }
            if (confirm) { setConfirm(null); return true; }
            return false;
        });
        return () => sub.remove();
    }, [confirm, alertsVisible, raising]);

    const raiseEmergency = async (emergency: EmergencyType) => {
        if (cooldown > 0 || raising || raisingRef.current) return;
        raisingRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRaising(emergency.apiType);

        try {
            const payload: any = {
                type: emergency.apiType,
                description: emergency.description,
            };
            // One location reading, taken now and never tracked. A phone without a fix still raises the alarm.
            let readingTimer: ReturnType<typeof setTimeout> | undefined;
            const reading = await Promise.race([getFreshReading(), new Promise<null>((resolve) => { readingTimer = setTimeout(() => resolve(null), 4000); })]);
            if (readingTimer) clearTimeout(readingTimer);
            if (reading) {
                payload.latitude = reading.latitude;
                payload.longitude = reading.longitude;
            }
            if (pickedPlace?.blockId) payload.blockId = pickedPlace.blockId;
            if (pickedPlace?.location) payload.location = pickedPlace.location;

            await api.post('/api/v1/community/emergencies', payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCooldown(COOLDOWN_SECONDS);
            setConfirm(null);
            setSent({ type: t(`emergency.${emergency.apiType}`), time: new Date() });
        } catch (err: any) {
            setConfirm(null);
            AppAlert.show(t('emergency.failed'), err?.response?.data?.message ?? t('emergency.failedText'));
        } finally {
            raisingRef.current = false;
            setRaising(null);
        }
    };

    // Load society alerts list
    const fetchSocietyAlerts = async () => {
        setAlertsLoading(true);
        try {
            const res = await api.get('/api/v1/community/emergencies');
            const data = res.data?.data?.emergencies ?? res.data?.data ?? res.data?.emergencies ?? [];
            setAlertsList(Array.isArray(data) ? data : []);
        } catch {
            setAlertsList([]);
        } finally {
            setAlertsLoading(false);
        }
    };

    const handleOpenAlerts = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAlertsVisible(true);
        void fetchSocietyAlerts();
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

    const filteredAlerts = alertsList.filter((item) => {
        if (alertsFilter === 'ACTIVE') return item.status === 'TRIGGERED' || item.status === 'ACTIVE' || item.status === 'ACKNOWLEDGED';
        if (alertsFilter === 'RESOLVED') return item.status === 'RESOLVED' || item.status === 'FALSE_ALARM';
        return true;
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#FAFAFA', '#F3F4F6', '#FFF0F0']}
                style={[styles.gradient, { paddingTop: insets.top + 8 }]}
            >
                {/* Top Nav Bar: Show Alerts (left) & Close/Back (right) */}
                <View style={styles.topBar}>
                    <TouchableOpacity
                        onPress={handleOpenAlerts}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Show active society emergency alerts"
                        style={styles.showAlertsBtn}
                    >
                        <MaterialIcons name="format-list-bulleted" size={17} color="#374151" />
                        <Text style={styles.showAlertsText}>Show Alerts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        testID="emergency-back"
                        accessibilityRole="button"
                        accessibilityLabel={t('common.back')}
                        onPress={() => router.back()}
                        activeOpacity={0.75}
                        style={styles.closeBtn}
                    >
                        <Ionicons name="close" size={22} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Main Scroll Content */}
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Section with Animated Siren */}
                    <View style={styles.headerSection}>
                        <Animated.View style={[sirenStyle, styles.sirenWrap]}>
                            <View style={styles.sirenCircle}>
                                <MaterialCommunityIcons name="alarm-light" size={26} color="#EF4444" />
                            </View>
                        </Animated.View>
                        <Text style={styles.title}>{t('emergency.title')}</Text>
                        <Text style={styles.sub}>{t('emergency.sub')}</Text>
                    </View>

                    {/* Central Hero SOS Button Hub */}
                    <View style={styles.heroSOSContainer}>
                        <HeroSOSButton
                            disabled={cooldown > 0 || !!raising}
                            onTrigger={() => {
                                const other = EMERGENCIES.find((e) => e.apiType === 'OTHER') ?? EMERGENCIES[0];
                                setConfirm(other);
                            }}
                        />
                    </View>

                    {/* 3-Column Category Cards Grid matching s-gate-master */}
                    <View className="px-3 w-full" style={styles.gridSection}>
                        <View className="flex-row flex-wrap justify-start" style={styles.gridRow}>
                            {EMERGENCIES.map((e, index) => {
                                const onCooldown = cooldown > 0;
                                return (
                                    <Animated.View
                                        key={e.apiType}
                                        entering={FadeInDown.delay(100 + index * 25).springify()}
                                        className="w-1/3 p-1.5"
                                        style={styles.tileCol}
                                    >
                                        <Pressable
                                            testID={`emergency-${e.apiType}`}
                                            accessibilityLabel={t(`emergency.${e.apiType}`)}
                                            accessibilityRole="button"
                                            disabled={onCooldown || !!raising}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setConfirm(e);
                                            }}
                                            className="items-center justify-center py-4 rounded-2xl bg-white shadow-sm shadow-gray-200/50 border border-gray-100 min-h-[90px]"
                                            style={({ pressed }) => ({
                                                backgroundColor: pressed ? '#fee2e2' : '#ffffff',
                                                minHeight: 90,
                                                paddingVertical: 16,
                                                paddingHorizontal: 4,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: '#E2E8F0',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                shadowColor: '#000000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.06,
                                                shadowRadius: 4,
                                                elevation: 2,
                                                opacity: onCooldown ? 0.5 : 1,
                                            })}
                                        >
                                            <View className="mb-2" style={styles.tileIconBox}>
                                                <MaterialIcons
                                                    name={e.icon}
                                                    size={28}
                                                    color={onCooldown ? '#9CA3AF' : '#EF4444'}
                                                />
                                            </View>
                                            <Text
                                                className="text-[11px] text-gray-800 font-bold text-center px-1"
                                                style={[styles.tileLabel, onCooldown && styles.tileLabelDisabled]}
                                                numberOfLines={2}
                                            >
                                                {t(`emergency.${e.apiType}`)}
                                            </Text>
                                            {onCooldown && (
                                                <Text style={styles.cooldownBadge}>
                                                    {t('emergency.cooldown', { n: cooldown })}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Bottom Live Location Pill */}
                    <View style={styles.locationPillSection}>
                        <View style={styles.locationPill}>
                            <MaterialIcons name="my-location" size={15} color="#EF4444" />
                            <Text style={styles.locationPillText}>
                                {t('emergency.sharesLocation')}
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Confirmation Modal Sheet */}
                <Modal
                    visible={!!confirm}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!raising) setConfirm(null);
                    }}
                >
                    <View style={styles.sheetBackdrop}>
                        <Pressable
                            style={StyleSheet.absoluteFillObject}
                            onPress={() => {
                                if (!raising) setConfirm(null);
                            }}
                        />
                        {confirm && (
                            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}>
                                <View style={[styles.sheetIconBox, { backgroundColor: confirm.bg }]}>
                                    <MaterialIcons name={confirm.icon} size={36} color={confirm.color} />
                                </View>
                                <Text style={styles.sheetTitle}>{t('emergency.confirmTitle')}</Text>
                                <Text style={styles.sheetText}>
                                    {confirm.apiType === 'HARASSMENT'
                                        ? t('emergency.confirmTextPrivate')
                                        : t('emergency.confirmText', { type: t(`emergency.${confirm.apiType}`) })}
                                </Text>

                                {places && (places.blocks.length > 0 || places.commonAreas.length > 0) ? (
                                    <View style={styles.placeBox}>
                                        <Text style={styles.placeTitle}>{t('emergency.where')}</Text>
                                        <Text style={styles.placeHint}>{t('emergency.whereHint')}</Text>
                                        <ScrollView style={styles.placeScroll} contentContainerStyle={styles.placeChips} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                            {places.blocks.map((block) => {
                                                const on = pickedPlace?.blockId === block.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={block.id}
                                                        testID={`place-block-${block.id}`}
                                                        accessibilityRole="button"
                                                        accessibilityState={{ selected: on }}
                                                        activeOpacity={0.8}
                                                        onPress={() => setPickedPlace(on ? null : { blockId: block.id })}
                                                        style={[styles.placeChip, on && styles.placeChipOn]}
                                                    >
                                                        <Text style={[styles.placeChipText, on && styles.placeChipTextOn]}>{block.name}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            {places.commonAreas.map((area) => {
                                                const on = pickedPlace?.location === area;
                                                return (
                                                    <TouchableOpacity
                                                        key={area}
                                                        testID={`place-area-${area}`}
                                                        accessibilityRole="button"
                                                        accessibilityState={{ selected: on }}
                                                        activeOpacity={0.8}
                                                        onPress={() => setPickedPlace(on ? null : { location: area })}
                                                        style={[styles.placeChip, on && styles.placeChipOn]}
                                                    >
                                                        <Text style={[styles.placeChipText, on && styles.placeChipTextOn]}>{area}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                ) : null}

                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t('emergency.send')}
                                    disabled={!!raising}
                                    activeOpacity={0.8}
                                    onPress={() => raiseEmergency(confirm)}
                                    style={styles.sheetSendBtn}
                                >
                                    {raising ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="campaign" size={22} color="#FFFFFF" />
                                            <Text style={styles.sheetSendBtnText}>{t('emergency.send')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    testID="emergency-cancel"
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.cancel')}
                                    disabled={!!raising}
                                    activeOpacity={0.7}
                                    onPress={() => setConfirm(null)}
                                    style={styles.sheetCancelBtn}
                                >
                                    <Text style={styles.sheetCancelBtnText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Modal>

                {/* Society Alerts Modal */}
                <Modal
                    visible={alertsVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setAlertsVisible(false)}
                >
                    <View style={styles.modalRoot}>
                        <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                            <View>
                                <Text style={styles.modalTitle}>Society Alerts</Text>
                                <Text style={styles.modalSub}>Emergency broadcasts reported in society</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setAlertsVisible(false)}
                                style={styles.modalCloseBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Close alerts modal"
                            >
                                <Ionicons name="close" size={22} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* Filter Tabs */}
                        <View style={styles.modalFilterRow}>
                            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((tab) => {
                                const active = alertsFilter === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        onPress={() => setAlertsFilter(tab)}
                                        style={[styles.modalFilterTab, active && styles.modalFilterTabActive]}
                                    >
                                        <Text style={[styles.modalFilterText, active && styles.modalFilterTextActive]}>
                                            {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'Active' : 'Resolved'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Alerts Content */}
                        {alertsLoading ? (
                            <View style={styles.modalCentered}>
                                <ActivityIndicator size="large" color="#EF4444" />
                            </View>
                        ) : filteredAlerts.length === 0 ? (
                            <View style={styles.modalCentered}>
                                <MaterialIcons name="verified-user" size={48} color="#94A3B8" />
                                <Text style={styles.modalEmptyTitle}>No Emergencies</Text>
                                <Text style={styles.modalEmptySub}>No {alertsFilter.toLowerCase()} alerts in your society.</Text>
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={styles.alertsListContent} showsVerticalScrollIndicator={false}>
                                {filteredAlerts.map((item) => {
                                    const meta = EMERGENCIES.find((e) => e.apiType === item.type) ?? EMERGENCIES[8];
                                    const isFalseAlarm = item.status === 'FALSE_ALARM';
                                    const isResolved = item.status === 'RESOLVED';
                                    const isAck = item.status === 'ACKNOWLEDGED';
                                    const isActive = item.status === 'TRIGGERED' || item.status === 'ACTIVE' || isAck;

                                    const statusLabel = isFalseAlarm
                                        ? 'False Alarm'
                                        : isResolved
                                        ? 'Resolved'
                                        : isAck
                                        ? 'Assigned'
                                        : 'Active';

                                    const statusBg = isFalseAlarm
                                        ? '#FEF3C7'
                                        : isResolved
                                        ? '#ECFDF5'
                                        : isAck
                                        ? '#DBEAFE'
                                        : '#FEE2E2';

                                    const statusColor = isFalseAlarm
                                        ? '#D97706'
                                        : isResolved
                                        ? '#059669'
                                        : isAck
                                        ? '#2563EB'
                                        : '#DC2626';

                                    const resolverName = item.resolvedBy?.name || item.respondedBy?.name;
                                    const noteText = item.resolutionNote || item.notes;
                                    const resolvedTime = item.resolvedAt;

                                    let resolvedByText = '';
                                    if (resolverName) {
                                        resolvedByText = `by ${resolverName}`;
                                    } else if (noteText && noteText.toLowerCase().includes('auto-expire')) {
                                        resolvedByText = 'by System (Auto-expired)';
                                    }

                                    const hasResolutionInfo = isResolved || isFalseAlarm || !!resolvedTime || !!resolverName || !!noteText;

                                    return (
                                        <View key={item.id} style={styles.alertCard}>
                                            <View style={styles.alertCardHeader}>
                                                <View style={[styles.alertIconBox, { backgroundColor: meta.bg }]}>
                                                    <MaterialIcons name={meta.icon} size={22} color={meta.color} />
                                                </View>
                                                <View style={styles.alertCardMiddle}>
                                                    <Text style={styles.alertCardType}>{meta.apiType.replace(/_/g, ' ')}</Text>
                                                    <Text style={styles.alertCardSender}>
                                                        {[item.flat?.flatNumber ? `Flat ${item.flat.flatNumber}` : null, item.reportedBy?.name].filter(Boolean).join(' • ') || 'Resident'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.alertStatusPill, { backgroundColor: statusBg }]}>
                                                    <Text style={[styles.alertStatusText, { color: statusColor }]}>
                                                        {statusLabel}
                                                    </Text>
                                                </View>
                                            </View>

                                            {item.description ? (
                                                <Text style={styles.alertDesc}>{item.description}</Text>
                                            ) : null}

                                            {/* Resolution Details */}
                                            {hasResolutionInfo && (isResolved || isFalseAlarm) ? (
                                                <View style={[styles.resolutionBox, isFalseAlarm ? styles.resolutionBoxAmber : styles.resolutionBoxGreen]}>
                                                    <View style={styles.resolutionHeaderRow}>
                                                        <MaterialIcons
                                                            name={isFalseAlarm ? 'info' : 'check-circle'}
                                                            size={15}
                                                            color={isFalseAlarm ? '#D97706' : '#059669'}
                                                        />
                                                        <Text style={[styles.resolutionHeaderText, { color: isFalseAlarm ? '#92400E' : '#065F46' }]}>
                                                            {isFalseAlarm
                                                                ? `Closed${resolvedTime ? ` on ${formatDateTime(resolvedTime)}` : ''}`
                                                                : `Resolved${resolvedTime ? ` on ${formatDateTime(resolvedTime)}` : ''}${resolvedByText ? ` • ${resolvedByText}` : ''}`}
                                                        </Text>
                                                    </View>
                                                    {noteText ? (
                                                        <View style={styles.resolutionNoteWrap}>
                                                            <Text style={styles.resolutionNoteLabel}>Note:</Text>
                                                            <Text style={styles.resolutionNoteText}>“{noteText}”</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            ) : null}

                                            {/* In-progress / Acknowledged Info for Active Emergency */}
                                            {isActive && resolverName ? (
                                                <View style={[styles.resolutionBox, styles.resolutionBoxBlue]}>
                                                    <View style={styles.resolutionHeaderRow}>
                                                        <MaterialIcons name="security" size={15} color="#2563EB" />
                                                        <Text style={[styles.resolutionHeaderText, { color: '#1E40AF' }]}>
                                                            Assigned to {resolverName}
                                                            {item.respondedAt ? ` • ${formatDateTime(item.respondedAt)}` : ''}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ) : null}

                                            <View style={styles.alertFooterRow}>
                                                <MaterialIcons name="access-time" size={13} color="#94A3B8" />
                                                <Text style={styles.alertTime}>
                                                    Reported {formatDateTime(item.createdAt)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </Modal>
            </LinearGradient>
            <AppBottomNav activeTab="emergency" />
        </View>
    );
}

// ── Hero SOS Button Component (Faithful to s-gate-master SOSButton) ──────────────
function HeroSOSButton({
    disabled,
    onTrigger,
}: {
    disabled: boolean;
    onTrigger: () => void;
}) {
    const [state, setState] = useState<'idle' | 'pressing' | 'success'>('idle');
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animations
    const scale = useSharedValue(1);
    const pulseRing = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.35);

    useEffect(() => {
        pulseRing.value = withRepeat(
            withSequence(
                withTiming(1.18, { duration: 1100 }),
                withTiming(1.0, { duration: 1100 })
            ),
            -1,
            true
        );
        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.12, { duration: 1100 }),
                withTiming(0.35, { duration: 1100 })
            ),
            -1,
            true
        );
    }, [pulseRing, pulseOpacity]);

    const handlePressIn = useCallback(() => {
        if (disabled || state === 'success') return;
        setState('pressing');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.vibrate(2000);

        scale.value = withSpring(1.06, { damping: 15, stiffness: 200 });

        holdTimer.current = setTimeout(() => {
            setState('success');
            Vibration.cancel();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            scale.value = withSequence(withSpring(1.15), withSpring(1));
            onTrigger();
            setTimeout(() => {
                setState('idle');
            }, 1500);
        }, 2000);
    }, [disabled, state, scale, onTrigger]);

    const handlePressOut = useCallback(() => {
        if (disabled || state === 'success') return;
        if (holdTimer.current) clearTimeout(holdTimer.current);
        setState('idle');
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        Vibration.cancel();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, [disabled, state, scale]);

    const buttonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const pulseRingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseRing.value }],
        opacity: state === 'pressing' ? 0.6 : pulseOpacity.value,
    }));

    return (
        <View style={styles.sosButtonWrapper}>
            {/* Ambient Pulsing Halo Rings */}
            <Animated.View style={[styles.sosPulseHalo, pulseRingStyle]} />

            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Emergency SOS button"
                accessibilityHint="Hold for 2 seconds to trigger emergency alert"
                style={styles.sosPressable}
            >
                <Animated.View style={[styles.sosButtonCore, buttonAnimStyle]}>
                    <LinearGradient
                        colors={state === 'success' ? ['#EF4444', '#B91C1C'] : ['#FF6B6B', '#EF4444', '#B91C1C']}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {/* Glass Gloss Arc */}
                    <View style={styles.sosGlossArc} />

                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSubText}>
                        {state === 'success' ? 'TRIGGERED' : state === 'pressing' ? 'ACTIVATING...' : 'HOLD 2 SEC'}
                    </Text>
                </Animated.View>
            </Pressable>
        </View>
    );
}

// ── Stylesheet ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    gradient: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 8,
        zIndex: 55,
    },
    showAlertsBtn: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    showAlertsText: {
        color: '#374151',
        fontFamily: GuardFonts.bold,
        fontSize: 13,
        fontWeight: '600',
    },
    closeBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
    },

    // Header & Siren
    headerSection: {
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 8,
    },
    sirenWrap: {
        marginBottom: 10,
    },
    sirenCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F87171',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        color: '#111827',
        fontFamily: GuardFonts.bold,
        fontSize: 26,
        lineHeight: 34,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    sub: {
        color: '#6B7280',
        fontFamily: GuardFonts.medium,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        marginTop: 2,
    },

    // Central Hero SOS Button
    heroSOSContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    sosButtonWrapper: {
        width: 170,
        height: 170,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    sosPulseHalo: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#FCA5A5',
    },
    sosPressable: {
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosButtonCore: {
        width: 122,
        height: 122,
        borderRadius: 61,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 6,
    },
    sosGlossArc: {
        position: 'absolute',
        top: -6,
        left: 10,
        width: 90,
        height: 38,
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 999,
        transform: [{ rotate: '-18deg' }],
    },
    sosText: {
        color: '#FFFFFF',
        fontFamily: GuardFonts.bold,
        fontSize: 32,
        lineHeight: 38,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 4,
    },
    sosSubText: {
        color: 'rgba(255,255,255,0.92)',
        fontFamily: GuardFonts.bold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginTop: 2,
    },

    // 3-Column Category Grid matching s-gate-master
    gridSection: {
        width: '100%',
        paddingHorizontal: 12,
        marginTop: 6,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    tileCol: {
        width: '33.333%',
        padding: 5,
    },
    tile: {
        minHeight: 90,
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tilePressed: {
        backgroundColor: '#FEE2E2',
    },
    tileDisabled: {
        opacity: 0.5,
    },
    tileIconBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    tileLabel: {
        color: '#1F2937',
        fontFamily: GuardFonts.bold,
        fontSize: 11,
        lineHeight: 15,
        fontWeight: '700',
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    tileLabelDisabled: {
        color: '#9CA3AF',
    },
    cooldownBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        color: '#DC2626',
        fontSize: 9,
        fontWeight: '700',
    },

    // Bottom Live Location Pill
    locationPillSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(254,242,242,0.95)',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        gap: 6,
        shadowColor: '#F87171',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    locationPillText: {
        color: '#B91C1C',
        fontFamily: GuardFonts.bold,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
    },

    // Confirm Bottom Sheet
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    sheetContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        gap: 12,
        alignItems: 'center',
        ...guardShadow('#000', 3),
    },
    placeBox: { alignSelf: 'stretch', marginTop: 4, marginBottom: 12 },
    placeTitle: { fontSize: 14, fontWeight: '800', color: '#111827', fontFamily: GuardFonts.bold },
    placeHint: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 8, fontFamily: GuardFonts.medium },
    placeScroll: { maxHeight: 132 },
    placeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    placeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
    placeChipOn: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
    placeChipText: { fontSize: 14, fontWeight: '700', color: '#374151', fontFamily: GuardFonts.bold },
    placeChipTextOn: { color: '#B91C1C' },
    sheetIconBox: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    sheetTitle: {
        color: '#111827',
        fontFamily: GuardFonts.bold,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        textAlign: 'center',
    },
    sheetText: {
        color: '#4B5563',
        fontFamily: GuardFonts.medium,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 16,
        marginBottom: 6,
    },
    sheetSendBtn: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    sheetSendBtnText: {
        color: '#FFFFFF',
        fontFamily: GuardFonts.bold,
        fontSize: 16,
        fontWeight: '700',
    },
    sheetCancelBtn: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetCancelBtnText: {
        color: '#6B7280',
        fontFamily: GuardFonts.bold,
        fontSize: 15,
        fontWeight: '600',
    },

    // Society Alerts Modal Styles
    modalRoot: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
        color: '#0F172A',
        fontFamily: GuardFonts.bold,
        fontSize: 20,
        fontWeight: '800',
    },
    modalSub: {
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalFilterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: '#FFFFFF',
    },
    modalFilterTab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
    },
    modalFilterTabActive: {
        backgroundColor: '#0F172A',
    },
    modalFilterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    modalFilterTextActive: {
        color: '#FFFFFF',
    },
    modalCentered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 8,
    },
    modalEmptyTitle: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '700',
    },
    modalEmptySub: {
        color: '#64748B',
        fontSize: 13,
        textAlign: 'center',
    },
    alertsListContent: {
        padding: 16,
        gap: 12,
    },
    alertCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    alertCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    alertCardMiddle: {
        flex: 1,
    },
    alertCardType: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '700',
    },
    alertCardSender: {
        color: '#64748B',
        fontSize: 12,
    },
    alertStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    alertStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    alertDesc: {
        color: '#334155',
        fontSize: 13,
        lineHeight: 18,
    },
    alertTime: {
        color: '#94A3B8',
        fontSize: 11,
    },
    alertFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    resolutionBox: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 4,
        marginTop: 2,
    },
    resolutionBoxGreen: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    resolutionBoxAmber: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    resolutionBoxBlue: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    resolutionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    resolutionHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    resolutionNoteWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        paddingLeft: 21,
    },
    resolutionNoteLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    resolutionNoteText: {
        fontSize: 12,
        color: '#334155',
        flex: 1,
        fontStyle: 'italic',
        lineHeight: 16,
    },
});
