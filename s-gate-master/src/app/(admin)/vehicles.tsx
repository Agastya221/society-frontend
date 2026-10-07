import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AnimatedBottomSheetModal } from '@/components/ui/AnimatedBottomSheetModal';
import EmptyState from '@/components/ui/EmptyState';
import { AppAlert } from '@/components/ui/AppAlert';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { isRouteMissing, serverMessage } from '@/services/apiErrors';
import { decideVehicle, listPendingVehicles, type AdminVehicle } from '@/services/vehicles.service';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vehicle {
    id: string;
    plateNumber: string;
    type: 'CAR' | 'BIKE' | 'OTHER';
    makeModel?: string;
    color?: string;
    stickerNumber?: string;
    parkingSlot?: string;
    flat: {
        id: string;
        number: string;
        block?: { name: string };
        isAdminFlat: boolean;
    };
    resident: {
        id: string;
        name: string;
        phone: string;
    };
    status: 'ACTIVE' | 'SUSPENDED';
}

interface Violation {
    id: string;
    vehicleNumber: string;
    type: string;
    source: 'OFFICIAL' | 'COMPLAINT';
    status: 'OPEN' | 'NOTIFIED' | 'RESOLVED' | 'DISMISSED';
    penaltyAmount?: number;
    addedToInvoice?: boolean;
    description?: string;
    reportedBy?: { id: string; name: string; role: string };
    vehicle?: any;
    resolutionNote?: string;
    createdAt: string;
}

const VIOLATION_TYPES = [
    'WRONG_PARKING', 'DOUBLE_PARKING', 'BLOCKING_GATE',
    'UNAUTHORIZED_SPOT', 'NO_STICKER', 'OTHER',
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AdminVehiclesScreen() {
    const router = useRouter();

    const [tab, setTab] = useState<'LOOKUP' | 'VIOLATIONS' | 'APPROVALS'>('LOOKUP');

    // Lookup State
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [lookupResults, setLookupResults] = useState<Vehicle[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Violations State
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loadingVios, setLoadingVios] = useState(false);

    // Modals
    const [issueTarget, setIssueTarget] = useState<Vehicle | string | null>(null); // Vehicle if known, plate string if unknown
    const [vType, setVType] = useState('WRONG_PARKING');
    const [vDesc, setVDesc] = useState('');
    const [vPenalty, setVPenalty] = useState('500');
    const [vInvoice, setVInvoice] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [resolveTarget, setResolveTarget] = useState<{ id: string, type: 'RESOLVED' | 'DISMISSED' } | null>(null);
    const [resNote, setResNote] = useState('');

    // Approvals State
    const [pending, setPending] = useState<AdminVehicle[]>([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    /** null until the first load; 'missing' when the server has no such route. */
    const [pendingState, setPendingState] = useState<'ready' | 'missing' | 'error' | null>(null);
    const [refreshingPending, setRefreshingPending] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<AdminVehicle | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    /** Vehicles with a decision in flight — guards double taps. */
    const decidingRef = useRef(new Set<string>());

    // ─── API: Lookup ──────────────────────────────────────────────────────────
    const handleSearch = async () => {
        if (!query.trim()) {
            AppAlert.show('Empty', 'Please enter a license plate or sticker (min 2 chars).');
            return;
        }
        setSearching(true);
        setHasSearched(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const res = await api.get('/admin/parking/lookup', {
                params: { q: query.trim().toUpperCase() }
            });
            const data = res.data?.data ?? [];
            setLookupResults(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Lookup error:', error);
            AppAlert.show('Error', error?.response?.data?.message || 'Failed to lookup vehicle.');
            setLookupResults([]);
        } finally {
            setSearching(false);
        }
    };

    // ─── API: Violations List ─────────────────────────────────────────────────
    const fetchViolations = async () => {
        setLoadingVios(true);
        try {
            const res = await api.get('/admin/parking/violations');
            const data = res.data?.data?.violations ?? [];
            setViolations(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Violations fetch error:', error);
        } finally {
            setLoadingVios(false);
        }
    };

    useFocusEffect(useCallback(() => {
        if (tab === 'VIOLATIONS') fetchViolations();
    }, [tab]));

    // ─── API: Issue Violation ─────────────────────────────────────────────────
    const submitViolation = async () => {
        setSubmitting(true);
        try {
            const payload: any = {
                type: vType,
                description: vDesc.trim(),
                penaltyAmount: vPenalty ? parseInt(vPenalty, 10) : undefined,
                addToInvoice: vInvoice,
            };

            if (typeof issueTarget === 'string') {
                // Unknown vehicle
                payload.vehicleNumber = issueTarget;
                await api.post('/admin/parking/violations', payload);
            } else if (issueTarget) {
                // Known vehicle
                payload.vehicleNumber = issueTarget.plateNumber;
                await api.post(`/admin/parking/vehicles/${issueTarget.id}/violations`, payload);
            }

            AppAlert.show('Success', 'Parking violation issued and notification sent.');
            setIssueTarget(null); setVDesc(''); setVPenalty('500'); setVInvoice(true);
            if (tab === 'VIOLATIONS') fetchViolations();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to issue violation.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── API: Resolve / Dismiss ───────────────────────────────────────────────
    const submitResolution = async () => {
        if (!resolveTarget) return;
        setSubmitting(true);
        try {
            await api.patch(`/admin/parking/violations/${resolveTarget.id}/resolve`, {
                status: resolveTarget.type,
                resolutionNote: resNote.trim() || 'Resolved by admin'
            });
            AppAlert.show('Success', `Violation ${resolveTarget.type.toLowerCase()}`);
            setResolveTarget(null); setResNote('');
            fetchViolations();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to update violation status.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── API: Vehicle approvals ───────────────────────────────────────────────
    const fetchPending = useCallback(async () => {
        try {
            const result = await listPendingVehicles();
            // Rows still being decided stay hidden so a refetch can't resurrect them.
            setPending(result.vehicles.filter(v => !decidingRef.current.has(v.id)));
            setPendingTotal(Math.max(0, result.total - decidingRef.current.size));
            setPendingState('ready');
        } catch (error: any) {
            if (isRouteMissing(error)) {
                setPendingState('missing');
                setPending([]);
                setPendingTotal(0);
            } else {
                // Keep the list already on screen.
                setPendingState(prev => (prev === 'ready' ? 'ready' : 'error'));
            }
        }
    }, []);

    // Load once on mount so the tab badge is right before the tab is opened,
    // then again whenever the screen or the tab regains focus.
    useEffect(() => { fetchPending(); }, [fetchPending]);
    useFocusEffect(useCallback(() => {
        if (tab === 'APPROVALS') fetchPending();
    }, [tab, fetchPending]));

    const refreshPending = async () => {
        setRefreshingPending(true);
        await fetchPending();
        setRefreshingPending(false);
    };

    const decide = async (vehicle: AdminVehicle, status: 'ACTIVE' | 'REJECTED', reason?: string) => {
        if (decidingRef.current.has(vehicle.id)) return;
        decidingRef.current.add(vehicle.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic: drop the row now, put it back where it was if the server refuses.
        const index = pending.findIndex(v => v.id === vehicle.id);
        setPending(list => list.filter(v => v.id !== vehicle.id));
        setPendingTotal(t => Math.max(0, t - 1));
        try {
            await decideVehicle(vehicle.id, status, reason);
        } catch (err: any) {
            setPending(list => {
                if (list.some(v => v.id === vehicle.id)) return list;
                const next = [...list];
                next.splice(index < 0 ? 0 : Math.min(index, next.length), 0, vehicle);
                return next;
            });
            setPendingTotal(t => t + 1);
            AppAlert.show(
                status === 'ACTIVE' ? 'Could not approve' : 'Could not reject',
                isRouteMissing(err)
                    ? 'Vehicle approval needs a server update. Nothing was changed.'
                    : serverMessage(err, `${vehicle.vehicleNumber} was not updated. Please try again.`),
            );
        } finally {
            decidingRef.current.delete(vehicle.id);
        }
    };

    const confirmReject = () => {
        const target = rejectTarget;
        if (!target) return;
        setRejectTarget(null);
        decide(target, 'REJECTED', rejectReason);
    };

    // ─── UI Renderers ─────────────────────────────────────────────────────────
    const renderLookupItem = ({ item }: { item: Vehicle }) => {
        const isOffice = item.flat?.isAdminFlat;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.platePill}>
                        <MaterialCommunityIcons name={item.type === 'BIKE' ? 'motorbike' : 'car-outline'} size={18} color={SgateColors.t1} />
                        <Text style={styles.violationPlate}>{item.plateNumber}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>
                        {item.makeModel ?? item.type} {item.color ? `· ${item.color}` : ''}
                    </Text>
                    {!!item.parkingSlot && (
                        <>
                            <Text style={styles.detailsText}>·</Text>
                            <Text style={styles.detailsText}>Slot {item.parkingSlot}</Text>
                        </>
                    )}
                </View>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Owner / Manager</Text>
                        <Text style={styles.infoValue}>{item.resident?.name || 'Unknown'}</Text>
                        <Text style={styles.infoSub}>{item.resident?.phone}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Destination</Text>
                        <Text style={styles.infoValue}>
                            {isOffice ? 'Admin Office' : `${item.flat?.block?.name ? item.flat.block.name + ' ' : ''}${item.flat?.number}`}
                        </Text>
                        {!!item.stickerNumber && <Text style={styles.infoSub}>Sticker: {item.stickerNumber}</Text>}
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={styles.callBtn} 
                        onPress={() => AppAlert.show('Call', `Calling ${item.resident?.phone}...`)}
                    >
                        <MaterialCommunityIcons name="phone" size={16} color={SgateColors.card} />
                        <Text style={styles.callText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.violationBtn}
                        onPress={() => setIssueTarget(item)}
                    >
                        <MaterialCommunityIcons name="alert-octagon" size={16} color={SgateColors.card} />
                        <Text style={styles.violationText}>Issue Ticket</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderViolation = ({ item, index }: { item: Violation; index: number }) => {
        const isOpen = item.status === 'OPEN' || item.status === 'NOTIFIED';
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify()}>
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <View style={styles.platePill}>
                            <MaterialCommunityIcons name="car-outline" size={18} color={SgateColors.t1} />
                            <Text style={styles.violationPlate}>{item.vehicleNumber}</Text>
                        </View>
                        <View style={[styles.statusBadge, !isOpen && { backgroundColor: SgateColors.surface }]}>
                            <Text style={[styles.statusText, !isOpen && { color: SgateColors.t3 }]}>{item.status}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.vioTypeRow}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={SgateColors.red} />
                        <Text style={styles.vioTypeLabel}>{item.type.replace('_', ' ')}</Text>
                    </View>
                    
                    {!!item.description && <Text style={styles.vioDesc}>{item.description}</Text>}

                    <View style={styles.vioMetaRow}>
                        <MaterialCommunityIcons name="account-outline" size={14} color={SgateColors.t3} />
                        <Text style={styles.vioMetaText}>{item.reportedBy?.name || item.source}</Text>
                        <Text style={styles.vioMetaText}>•</Text>
                        <Text style={styles.vioMetaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    
                    {!!item.penaltyAmount && isOpen && (
                        <View style={styles.penaltyRow}>
                            <MaterialCommunityIcons name="cash" size={18} color={SgateColors.green} />
                            <Text style={styles.penaltyText}>Penalty: {item.penaltyAmount} INR {item.addedToInvoice ? '(Invoiced)' : ''}</Text>
                        </View>
                    )}

                    {isOpen && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.dismissBtn} onPress={() => setResolveTarget({ id: item.id, type: 'DISMISSED' })}>
                                <Text style={styles.dismissText}>Dismiss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.resolveBtnDark} onPress={() => setResolveTarget({ id: item.id, type: 'RESOLVED' })}>
                                <MaterialCommunityIcons name="check-circle-outline" size={16} color={SgateColors.card} />
                                <Text style={styles.resolveTextDark}>Mark Resolved</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    const renderPending = ({ item, index }: { item: AdminVehicle; index: number }) => {
        const isBike = /bike|scooter|two/i.test(item.vehicleType);
        return (
            <Animated.View entering={index < 8 ? FadeInDown.delay(index * 50).springify() : undefined}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.platePill}>
                            <MaterialCommunityIcons name={isBike ? 'motorbike' : 'car-outline'} size={18} color={SgateColors.t1} />
                            <Text style={styles.violationPlate}>{item.vehicleNumber}</Text>
                        </View>
                        <View style={[styles.statusBadge, styles.pendingBadge]}>
                            <Text style={[styles.statusText, styles.pendingBadgeText]}>PENDING</Text>
                        </View>
                    </View>

                    <View style={styles.detailsRow}>
                        <Text style={styles.detailsText} numberOfLines={1}>
                            {[item.vehicleType, item.model, item.color].filter(Boolean).join(' · ')}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Owner</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{item.owner?.name || 'Unknown'}</Text>
                            {!!item.owner?.phone && <Text style={styles.infoSub}>{item.owner.phone}</Text>}
                        </View>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Flat</Text>
                            <Text style={styles.infoValue}>{item.flatLabel || '—'}</Text>
                            {!!item.createdAt && (
                                <Text style={styles.infoSub}>Added {new Date(item.createdAt).toLocaleDateString()}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.decisionRow}>
                        <PrimaryButton
                            title="Reject"
                            variant="outline"
                            style={styles.decisionBtn}
                            onPress={() => { setRejectReason(''); setRejectTarget(item); }}
                        />
                        <PrimaryButton
                            title="Approve"
                            style={styles.decisionBtn}
                            leftIcon={<MaterialCommunityIcons name="check" size={18} color={SgateColors.t1} />}
                            onPress={() => decide(item, 'ACTIVE')}
                        />
                    </View>
                </View>
            </Animated.View>
        );
    };

    const tabs: { key: typeof tab; label: string; badge?: number }[] = [
        { key: 'LOOKUP', label: 'Lookup' },
        { key: 'VIOLATIONS', label: 'Violations' },
        { key: 'APPROVALS', label: 'Approvals', badge: pendingTotal },
    ];

    return (
        <View style={styles.safe}>
            {/* Header */}
            <ScreenHeader title="Parking Enforcement" onBack={() => router.back()}>
                {/* Segmented Control */}
                <View style={styles.tabWrapper}>
                    <View style={styles.segmentedContainer}>
                        {tabs.map(t => {
                            const active = tab === t.key;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.segment, active && styles.segmentActive]}
                                    onPress={() => { Haptics.selectionAsync(); setTab(t.key); }}
                                    activeOpacity={0.8}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: active }}
                                >
                                    <View style={styles.segmentInner}>
                                        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{t.label}</Text>
                                        {!!t.badge && (
                                            <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                                                <Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>
                                                    {t.badge > 99 ? '99+' : t.badge}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScreenHeader>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {/* Lookup Tab */}
            {tab === 'LOOKUP' && (
                <>
                    <View style={styles.searchSection}>
                        <View style={styles.searchBox}>
                            <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t3} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search plate (e.g. MH12AB) or sticker"
                                placeholderTextColor={SgateColors.t4}
                                value={query}
                                onChangeText={setQuery}
                                autoCapitalize="characters"
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                        </View>
                        <TouchableOpacity style={[styles.searchBtn, !query.trim() && { opacity: 0.5 }]} onPress={handleSearch} disabled={!query.trim() || searching}>
                            {searching ? <ActivityIndicator size="small" color={SgateColors.card} /> : <Text style={styles.searchBtnText}>Search</Text>}
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={lookupResults}
                        keyExtractor={(item) => item.id}
                        renderItem={renderLookupItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            hasSearched && !searching ? (
                                <View style={styles.emptyWrap}>
                                    <MaterialCommunityIcons name="shield-off-outline" size={48} color={SgateColors.t4} />
                                    <Text style={styles.emptyTitle}>Vehicle Not Found</Text>
                                    <Text style={styles.emptySub}>Not registered in society directory.</Text>
                                    <TouchableOpacity 
                                        style={styles.issueUnknownBtn} 
                                        onPress={() => setIssueTarget(query.toUpperCase())}
                                    >
                                        <Text style={styles.issueUnknownText}>Issue ticket to {query.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    />
                </>
            )}

            {/* Violations Tab */}
            {tab === 'VIOLATIONS' && (
                <FlatList
                    data={violations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderViolation}
                    contentContainerStyle={styles.listContent}
                    refreshing={loadingVios}
                    onRefresh={fetchViolations}
                    ListEmptyComponent={
                        !loadingVios ? (
                            <EmptyState
                                iconName="check-circle-outline"
                                title="All Clear"
                                description="No active parking violations."
                            />
                        ) : null
                    }
                />
            )}

            {/* Approvals Tab */}
            {tab === 'APPROVALS' && (
                pendingState === null && pending.length === 0 ? (
                    <View style={styles.tabLoader}><ActivityIndicator color={SgateColors.goldDeep} /></View>
                ) : (
                    <FlatList
                        data={pending}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPending}
                        contentContainerStyle={styles.listContent}
                        refreshing={refreshingPending}
                        onRefresh={refreshPending}
                        ListHeaderComponent={pendingState === 'error' && pending.length > 0 ? (
                            <Text style={styles.inlineError}>Could not refresh. Pull down to try again.</Text>
                        ) : null}
                        ListEmptyComponent={
                            pendingState === 'missing' ? (
                                <EmptyState
                                    iconName="cloud-alert-outline"
                                    title="Needs server update"
                                    description="Vehicle approvals aren't available on this server yet."
                                />
                            ) : pendingState === 'error' ? (
                                <EmptyState
                                    iconName="wifi-off"
                                    title="Couldn't load approvals"
                                    description="Check your connection and try again."
                                    ctaLabel="Retry"
                                    onCtaPress={refreshPending}
                                />
                            ) : (
                                <EmptyState
                                    iconName="check-circle-outline"
                                    title="No pending vehicles"
                                    description="New vehicles residents register will appear here for approval."
                                />
                            )
                        }
                    />
                )
            )}

            {/* Reject Vehicle Sheet */}
            <AnimatedBottomSheetModal visible={!!rejectTarget} onClose={() => setRejectTarget(null)}>
                <Text style={styles.modalTitle}>Reject vehicle</Text>
                <Text style={styles.modalSub}>
                    {rejectTarget?.vehicleNumber}{rejectTarget?.owner?.name ? ` · ${rejectTarget.owner.name}` : ''}
                </Text>
                <Text style={[styles.fieldLabel, styles.fieldLabelFirst]}>Reason (optional)</Text>
                <TextInput
                    style={styles.inputArea}
                    placeholder="e.g. Plate number doesn't match the RC"
                    placeholderTextColor={SgateColors.t4}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    maxLength={200}
                    multiline
                />
                <Text style={styles.sheetHint}>The resident sees this reason on their vehicle.</Text>
                <View style={styles.decisionSheetRow}>
                    <PrimaryButton title="Cancel" variant="secondary" style={styles.decisionBtn} onPress={() => setRejectTarget(null)} />
                    <PrimaryButton title="Reject" variant="danger" style={styles.decisionBtn} onPress={confirmReject} />
                </View>
            </AnimatedBottomSheetModal>

            {/* Issue Violation Modal */}
            <AnimatedBottomSheetModal visible={!!issueTarget} onClose={() => setIssueTarget(null)}>
                <Text style={styles.modalTitle}>Issue Violation</Text>
                <Text style={styles.modalSub}>
                    Target: {typeof issueTarget === 'string' ? issueTarget : issueTarget?.plateNumber}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={styles.fieldLabel}>Violation Type</Text>
                    <View style={styles.tagsContainer}>
                        {VIOLATION_TYPES.map(vt => (
                            <TouchableOpacity key={vt} style={[styles.tag, vType === vt && styles.tagActive]} onPress={() => setVType(vt)}>
                                <Text style={[styles.tagText, vType === vt && styles.tagTextActive]}>{vt.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Description (Optional)</Text>
                    <TextInput
                        style={styles.inputArea}
                        placeholder="Details..."
                        placeholderTextColor={SgateColors.t4}
                        value={vDesc}
                        onChangeText={setVDesc}
                        multiline
                    />

                    <View style={styles.rowFields}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Penalty (INR)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={vPenalty} onChangeText={setVPenalty} />
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.fieldLabel}>Add to Invoice</Text>
                            <Switch value={vInvoice} onValueChange={setVInvoice} trackColor={{ true: SgateColors.green }} />
                        </View>
                    </View>

                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setIssueTarget(null)}>
                            <Text style={styles.modalCancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalSubmit} onPress={submitViolation} disabled={submitting}>
                            {submitting ? <ActivityIndicator color={SgateColors.card} /> : <Text style={styles.modalSubmitTxt}>Confirm Issue</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </AnimatedBottomSheetModal>

            {/* Resolve/Dismiss Modal */}
            <Modal visible={!!resolveTarget} transparent animationType="fade" onRequestClose={() => setResolveTarget(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.smallModal}>
                        <Text style={styles.modalTitle}>{resolveTarget?.type === 'RESOLVED' ? 'Mark Resolved' : 'Dismiss Violation'}</Text>
                        <TextInput
                            style={styles.inputArea}
                            placeholder="Reason / Note..."
                            placeholderTextColor={SgateColors.t4}
                            value={resNote}
                            onChangeText={setResNote}
                            multiline
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setResolveTarget(null)}>
                                <Text style={styles.modalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSubmit, resolveTarget?.type === 'DISMISSED' && { backgroundColor: SgateColors.t3 }]} onPress={submitResolution} disabled={submitting}>
                                {submitting ? <ActivityIndicator color={SgateColors.card} /> : <Text style={styles.modalSubmitTxt}>Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    // ── Header + Tabs (unified block) ────────────────────────────
    headerWrapper: {
        backgroundColor: SgateColors.card,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SgateLayout.screenGutter,
        paddingBottom: 16,
    },
    headerIconBtn: {
        width: 32,
        height: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitleMain: {
        flex: 1,
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
    },

    // ── Tabs ─────────────────────────────────────────────────────
    tabWrapper: {
        backgroundColor: SgateColors.card,
        paddingHorizontal: SgateLayout.screenGutter,
        paddingBottom: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentActive: {
        backgroundColor: SgateColors.gold,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    segmentTextActive: {
        color: SgateColors.t1,
        fontFamily: SgateFonts.bold,
    },
    segmentInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    segmentBadge: {
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        backgroundColor: SgateColors.ink,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBadgeActive: { backgroundColor: SgateColors.card },
    segmentBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.card },
    segmentBadgeTextActive: { color: SgateColors.t1 },

    searchSection: { padding: 20 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: SgateColors.border, marginBottom: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    searchBtn: { backgroundColor: SgateColors.gold, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    searchBtnText: { color: SgateColors.t1, fontSize: 15, fontFamily: SgateFonts.bold },

    listContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

    card: { 
        backgroundColor: SgateColors.card, 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 16, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    platePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: SgateColors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    violationPlate: { fontSize: 16, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, letterSpacing: 0.5 },
    statusBadge: { backgroundColor: SgateColors.redBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.red },

    detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    detailsText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginBottom: 16 },

    infoGrid: { flexDirection: 'row', marginBottom: 16 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t4, marginBottom: 4, textTransform: 'uppercase' },
    infoValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    infoSub: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    emptyWrap: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', marginBottom: 16 },
    issueUnknownBtn: { backgroundColor: SgateColors.gold, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    issueUnknownText: { color: SgateColors.card, fontSize: 14, fontFamily: SgateFonts.bold },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
    modalContent: { paddingHorizontal: 28, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
    smallModal: { backgroundColor: SgateColors.card, margin: 24, padding: 28, borderRadius: 32, marginBottom: 'auto', marginTop: 'auto', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, marginBottom: 8 },
    modalSub: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginBottom: 24 },
    
    fieldLabel: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    inputArea: { backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, height: 100, textAlignVertical: 'top' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border },
    tagActive: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },
    tagText: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    tagTextActive: { color: SgateColors.t1 },
    rowFields: { flexDirection: 'row', gap: 16, alignItems: 'center' },

    modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
    modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: SgateColors.surface, alignItems: 'center' },
    modalCancelTxt: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    modalSubmit: { flex: 1.2, paddingVertical: 16, borderRadius: 16, backgroundColor: SgateColors.red, alignItems: 'center', shadowColor: SgateColors.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    modalSubmitTxt: { fontSize: 15, fontFamily: SgateFonts.extrabold, color: SgateColors.card },

    // Violations ListItem Styles
    vioTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    vioTypeLabel: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red },
    vioDesc: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2, marginBottom: 14, lineHeight: 22 },
    vioMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    vioMetaText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    
    penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SgateColors.greenBg, padding: 12, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: SgateColors.greenBg },
    penaltyText: { color: SgateColors.greenText, fontSize: 14, fontFamily: SgateFonts.bold },
    
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    dismissBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.surface, paddingVertical: 14, borderRadius: 12 },
    dismissText: { color: SgateColors.t2, fontSize: 14, fontFamily: SgateFonts.bold },
    resolveBtnDark: { flex: 1.5, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.ink, paddingVertical: 14, borderRadius: 12 },
    resolveTextDark: { color: SgateColors.card, fontSize: 14, fontFamily: SgateFonts.bold },

    // Approvals
    pendingBadge: { backgroundColor: SgateColors.goldPale },
    pendingBadgeText: { color: SgateColors.goldDeep },
    decisionRow: { flexDirection: 'row', gap: 12 },
    decisionSheetRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    decisionBtn: { flex: 1 },
    tabLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    inlineError: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.red, marginBottom: 12 },
    fieldLabelFirst: { marginTop: 0 },
    sheetHint: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 8 },

    // Lookup action buttons
    callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.ink, borderRadius: 12, paddingVertical: 14, gap: 6 },
    callText: { color: SgateColors.card, fontSize: 14, fontFamily: SgateFonts.bold },
    violationBtn: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.red, borderRadius: 12, paddingVertical: 14, gap: 6 },
    violationText: { color: SgateColors.card, fontSize: 14, fontFamily: SgateFonts.bold },
});
