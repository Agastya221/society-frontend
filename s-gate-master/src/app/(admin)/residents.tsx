import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AnimatedBottomSheetModal } from '@/components/ui/AnimatedBottomSheetModal';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import { Avatar } from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SgateColors, SgateFonts, SgateLayout, SgateRadius, SgateSurfaces, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import {
    addAdminResident,
    isRouteMissing,
    listAdminResidents,
    removeAdminResident,
    serverMessage,
    type AdminResident,
    type AdminResidentType,
} from '@/services/adminResidents.service';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Types / config ───────────────────────────────────────────────────────────

interface FlatOption {
    id: string;
    number: string;
    block: string;
}

const PAGE_SIZE = 20;

const TYPE_STYLE: Record<AdminResidentType, { bg: string; color: string; label: string }> = {
    OWNER:  { bg: SgateColors.violetBg, color: SgateColors.violet, label: 'Owner' },
    TENANT: { bg: SgateColors.blueBg, color: SgateColors.blue, label: 'Tenant' },
    FAMILY: { bg: SgateColors.greenBg, color: SgateColors.green, label: 'Family' },
};

const TYPE_ORDER: AdminResidentType[] = ['OWNER', 'TENANT', 'FAMILY'];

/**
 * `api`: the /admin/residents endpoint answers. `legacy`: the server has no such
 * route yet, so the list falls back to approved onboarding requests and adding /
 * removing is unavailable. `null` until the first load settles.
 */
type Source = 'api' | 'legacy' | null;

const flatLabel = (r: AdminResident) => {
    if (!r.flat?.flatNumber) return 'Flat unknown';
    return r.flat.block?.name ? `${r.flat.block.name}-${r.flat.flatNumber}` : r.flat.flatNumber;
};

/** Accepts "98765 43210", "+91 9876543210" or "09876543210"; returns 10 digits or ''. */
const normalisePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
};

/** Approved onboarding requests — the only resident list an older server offers. */
async function loadLegacyResidents(): Promise<AdminResident[]> {
    const res = await api.get('/resident/onboarding/admin/pending', {
        params: { status: 'APPROVED', page: 1, limit: 100 },
    });
    const payload = res.data?.data;
    const raw: any[] = Array.isArray(payload) ? payload : payload?.requests ?? [];
    return raw
        .map((r: any): AdminResident => {
            const id = String(r?.resident?.id ?? r?.user?.id ?? r?.id ?? '');
            const blockName = r?.flat?.block?.name ?? r?.flat?.block ?? r?.block?.name ?? '';
            return {
                id,
                // No membership id on this payload, so these rows cannot be removed.
                membershipId: '',
                name: String(r?.resident?.name ?? r?.user?.name ?? 'Resident'),
                phone: String(r?.resident?.phone ?? r?.user?.phone ?? ''),
                photoUrl: null,
                residentType: r?.residentType === 'TENANT' ? 'TENANT' : 'OWNER',
                isPrimary: false,
                flat: {
                    id: String(r?.flatId ?? r?.flat?.id ?? ''),
                    flatNumber: String(r?.flat?.flatNumber ?? ''),
                    block: blockName ? { id: '', name: String(blockName) } : null,
                },
                createdAt: r?.createdAt ?? null,
            };
        })
        .filter(r => r.id);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResidentsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(s => s.user);
    const adminSocietyId = useAuthStore(s =>
        s.userContexts.find(c => c.membershipId === s.selectedAdminContextId)?.societyId);
    const societyId = user?.societyId || adminSocietyId || null;

    // List
    const [source, setSource] = useState<Source>(null);
    const [residents, setResidents] = useState<AdminResident[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loadError, setLoadError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Search (debounced for the server; legacy rows are filtered locally)
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    /** Ignores responses that were overtaken by a newer search or refresh. */
    const requestRef = useRef(0);
    const loadingMoreRef = useRef(false);
    const sourceRef = useRef<Source>(null);
    sourceRef.current = source;

    const loadFirstPage = useCallback(async (q: string) => {
        const requestId = ++requestRef.current;
        try {
            const result = await listAdminResidents({ search: q, page: 1, limit: PAGE_SIZE });
            if (requestId !== requestRef.current) return;
            setResidents(result.residents);
            setTotal(result.pagination.total);
            setPage(result.pagination.page);
            setPages(result.pagination.pages);
            setSource('api');
            setLoadError('');
        } catch (err) {
            if (requestId !== requestRef.current) return;
            if (isRouteMissing(err)) {
                try {
                    const legacy = await loadLegacyResidents();
                    if (requestId !== requestRef.current) return;
                    setResidents(legacy);
                    setTotal(legacy.length);
                    setPage(1);
                    setPages(1);
                    setSource('legacy');
                    setLoadError('');
                } catch (legacyErr) {
                    if (requestId !== requestRef.current) return;
                    setSource(s => s ?? 'legacy');
                    setLoadError(serverMessage(legacyErr, 'Could not load residents.'));
                }
                return;
            }
            // Keep whatever is already on screen; only report the failure.
            setSource(s => s ?? 'api');
            setLoadError(serverMessage(err, 'Could not load residents. Pull down to retry.'));
        }
    }, []);

    // First load, and every settled search term. Legacy rows are filtered
    // locally, so a new term needs no request there.
    useEffect(() => {
        if (sourceRef.current === 'legacy') return;
        let cancelled = false;
        setSearching(true);
        loadFirstPage(query).finally(() => { if (!cancelled) setSearching(false); });
        return () => { cancelled = true; };
    }, [query, loadFirstPage]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFirstPage(query);
        setRefreshing(false);
    }, [loadFirstPage, query]);

    const loadMore = useCallback(async () => {
        if (source !== 'api' || loadingMoreRef.current || page >= pages || refreshing || searching) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        const requestId = requestRef.current;
        try {
            const result = await listAdminResidents({ search: query, page: page + 1, limit: PAGE_SIZE });
            if (requestId !== requestRef.current) return;
            setResidents(prev => {
                const seen = new Set(prev.map(r => r.membershipId));
                return [...prev, ...result.residents.filter(r => !seen.has(r.membershipId))];
            });
            setTotal(result.pagination.total);
            setPage(result.pagination.page);
            setPages(result.pagination.pages);
        } catch (err) {
            AppAlert.show('Could not load more', serverMessage(err, 'Please try again.'));
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [page, pages, query, refreshing, searching, source]);

    const visibleResidents = useMemo(() => {
        if (source !== 'legacy' || !query) return residents;
        const q = query.toLowerCase();
        return residents.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.phone.includes(q) ||
            flatLabel(r).toLowerCase().includes(q));
    }, [query, residents, source]);

    // ── Flats for the add sheet ────────────────────────────────────────────
    const [flatOptions, setFlatOptions] = useState<FlatOption[]>([]);
    const [flatsState, setFlatsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    const loadFlats = useCallback(async () => {
        if (!societyId) { setFlatsState('error'); return; }
        setFlatsState('loading');
        try {
            const blocksRes = await api.get(`/resident/onboarding/societies/${societyId}/blocks`);
            const blocks: { id: string; name: string }[] = blocksRes.data?.data ?? [];
            const all: FlatOption[] = [];
            await Promise.all(blocks.map(async block => {
                try {
                    const flatsRes = await api.get(
                        `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`);
                    all.push(...(flatsRes.data?.data ?? [])
                        .map((f: any) => ({
                            id: String(f?.id ?? ''),
                            number: String(f?.flatNumber ?? f?.number ?? ''),
                            block: String(f?.blockName ?? block?.name ?? ''),
                        }))
                        .filter((flat: FlatOption) => flat.id && flat.number));
                } catch {
                    // One block failing shouldn't hide the rest.
                }
            }));
            all.sort((a, b) =>
                a.block.localeCompare(b.block, undefined, { numeric: true }) ||
                a.number.localeCompare(b.number, undefined, { numeric: true }));
            setFlatOptions(all);
            setFlatsState('ready');
        } catch {
            setFlatsState('error');
        }
    }, [societyId]);

    // ── Add sheet ──────────────────────────────────────────────────────────
    const [sheetOpen, setSheetOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'flat'>('form');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [flatId, setFlatId] = useState('');
    const [residentType, setResidentType] = useState<AdminResidentType>('OWNER');
    const [flatSearch, setFlatSearch] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);

    const selectedFlat = flatOptions.find(f => f.id === flatId) ?? null;
    const filteredFlats = useMemo(() => {
        const q = flatSearch.trim().toLowerCase();
        if (!q) return flatOptions;
        return flatOptions.filter(f =>
            f.number.toLowerCase().includes(q) ||
            f.block.toLowerCase().includes(q) ||
            `${f.block}-${f.number}`.toLowerCase().includes(q));
    }, [flatOptions, flatSearch]);

    const openAddSheet = () => {
        if (source === 'legacy') {
            AppAlert.show(
                'Needs server update',
                'Adding residents directly needs a server update. Until then, residents add their flat from the S-Gate app and you approve the request in Onboarding.',
                [
                    { text: 'Close', style: 'cancel' },
                    { text: 'View Requests', onPress: () => router.push('/(admin)/onboarding-requests' as any) },
                ],
            );
            return;
        }
        setName(''); setPhone(''); setFlatId(''); setResidentType('OWNER');
        setFlatSearch(''); setFormError(''); setStep('form');
        setSheetOpen(true);
        if (flatsState === 'idle' || flatsState === 'error') loadFlats();
    };

    const closeSheet = () => {
        if (submittingRef.current) return;
        setSheetOpen(false);
    };

    const submitAdd = async () => {
        if (submittingRef.current) return;
        const cleanName = name.trim().replace(/\s+/g, ' ');
        const cleanPhone = normalisePhone(phone);
        if (cleanName.length < 2) { setFormError('Enter the resident\'s full name.'); return; }
        if (!cleanPhone) { setFormError('Enter a valid 10-digit Indian mobile number.'); return; }
        if (!flatId) { setFormError('Choose the flat this resident belongs to.'); return; }

        submittingRef.current = true;
        setSubmitting(true);
        setFormError('');
        try {
            const created = await addAdminResident({ name: cleanName, phone: cleanPhone, flatId, residentType });
            submittingRef.current = false;
            setSubmitting(false);
            setSheetOpen(false);
            // Show the new row straight away, then sync with the server's order.
            if (created.membershipId && !query) {
                setResidents(prev => [created, ...prev.filter(r => r.membershipId !== created.membershipId)]);
                setTotal(t => t + 1);
            }
            loadFirstPage(query);
            AppAlert.show('Resident added', `${cleanName} can now sign in to S-Gate with ${cleanPhone}.`);
        } catch (err: any) {
            submittingRef.current = false;
            setSubmitting(false);
            if (isRouteMissing(err)) {
                setFormError('Adding residents needs a server update. Nothing was saved.');
                return;
            }
            const status = err?.response?.status;
            if (!err?.response) {
                setFormError('No connection. Check your internet and try again.');
            } else if (status === 409 || status === 400 || status === 422 || status === 404) {
                setFormError(serverMessage(err, 'Please check the details and try again.'));
            } else {
                setFormError(serverMessage(err, 'Could not add the resident. Please try again.'));
            }
        }
    };

    // ── Remove ─────────────────────────────────────────────────────────────
    const confirmRemove = (r: AdminResident) => {
        if (!r.membershipId || removingId) return;
        AppAlert.show(
            'Remove from flat?',
            `${r.name} will lose access to ${flatLabel(r)} — gate approvals, passes and notices for this flat. Their account and other flats are not affected.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeResident(r) },
            ],
        );
    };

    const removeResident = async (r: AdminResident) => {
        setRemovingId(r.membershipId);
        try {
            await removeAdminResident(r.membershipId);
            setResidents(prev => prev.filter(x => x.membershipId !== r.membershipId));
            setTotal(t => Math.max(0, t - 1));
        } catch (err) {
            AppAlert.show(
                'Could not remove',
                isRouteMissing(err)
                    ? 'Removing residents needs a server update. Nothing was changed.'
                    : serverMessage(err, 'Please try again.'),
            );
        } finally {
            setRemovingId(null);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    const renderItem = ({ item, index }: { item: AdminResident; index: number }) => {
        const ts = TYPE_STYLE[item.residentType];
        // The server refuses removing yourself, so don't offer it on the admin's own row.
        const canRemove = source === 'api' && !!item.membershipId && item.id !== user?.id;
        const removing = removingId === item.membershipId;
        return (
            <Animated.View entering={index < 10 ? FadeInDown.delay(index * 50).springify() : undefined}>
                <View style={styles.card}>
                    <View style={styles.cardTop}>
                        <Avatar name={item.name} photoUrl={item.photoUrl?.startsWith('http') ? item.photoUrl : undefined} size={44} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                            {!!item.phone && <Text style={styles.cardPhone}>{item.phone}</Text>}
                        </View>
                        <View style={[styles.typePill, { backgroundColor: ts.bg }]}>
                            <Text style={[styles.typePillText, { color: ts.color }]}>{ts.label}</Text>
                        </View>
                    </View>

                    <View style={styles.cardBottom}>
                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons name="home-outline" size={15} color={SgateColors.t3} />
                            <Text style={styles.metaText} numberOfLines={1}>{flatLabel(item)}</Text>
                            {item.isPrimary && (
                                <View style={styles.primaryBadge}>
                                    <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                            )}
                        </View>
                        {canRemove && (
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => confirmRemove(item)}
                                disabled={!!removingId}
                                activeOpacity={0.75}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${item.name} from flat`}
                            >
                                {removing
                                    ? <ActivityIndicator size="small" color={SgateColors.red} />
                                    : <Text style={styles.removeText}>Remove from flat</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>
        );
    };

    const initialLoading = source === null && residents.length === 0;

    return (
        <View style={styles.root}>
            <ScreenHeader title="Residents" onBack={() => router.back()}>
                <View style={styles.searchWrap}>
                    <View style={styles.searchBox}>
                        <Feather name="search" size={17} color={SgateColors.t3} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search name, phone or flat"
                            placeholderTextColor={SgateColors.t4}
                            value={search}
                            onChangeText={setSearch}
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {searching && !initialLoading ? (
                            <ActivityIndicator size="small" color={SgateColors.t3} />
                        ) : search ? (
                            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                                <Feather name="x" size={17} color={SgateColors.t3} />
                            </Pressable>
                        ) : null}
                    </View>
                </View>
            </ScreenHeader>

            {initialLoading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={visibleResidents}
                    keyExtractor={(item, i) => item.membershipId || `${item.id}-${i}`}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom }]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SgateColors.goldDeep} colors={[SgateColors.goldDeep]} />
                    }
                    ListHeaderComponent={
                        <View>
                            <PrimaryButton
                                title="Add Resident"
                                onPress={openAddSheet}
                                leftIcon={<Feather name="user-plus" size={18} color={SgateColors.t1} />}
                            />
                            {source === 'legacy' && (
                                <View style={styles.notice}>
                                    <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={SgateColors.goldDeep} />
                                    <Text style={styles.noticeText}>
                                        Showing approved onboarding requests. Adding and removing residents needs a server update.
                                    </Text>
                                </View>
                            )}
                            {!!loadError && (
                                <View style={[styles.notice, styles.noticeError]}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={SgateColors.red} />
                                    <Text style={styles.noticeText}>{loadError}</Text>
                                </View>
                            )}
                            {visibleResidents.length > 0 && (
                                <Text style={styles.countText}>
                                    {source === 'api' ? total : visibleResidents.length}{' '}
                                    {(source === 'api' ? total : visibleResidents.length) === 1 ? 'resident' : 'residents'}
                                    {query ? ` matching "${query}"` : ''}
                                </Text>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        loadError && residents.length === 0 ? null : query ? (
                            <EmptyState
                                iconName="account-search-outline"
                                title="No matches"
                                description={`No resident matches "${query}".`}
                            />
                        ) : (
                            <EmptyState
                                iconName="account-group-outline"
                                title="No residents yet"
                                description={source === 'api'
                                    ? 'Add a resident, or approve onboarding requests, to see them here.'
                                    : 'Approved residents will appear here.'}
                            />
                        )
                    }
                    ListFooterComponent={loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator color={SgateColors.goldDeep} />
                        </View>
                    ) : null}
                />
            )}

            {/* ── Add resident sheet ───────────────────────────────────── */}
            <AnimatedBottomSheetModal visible={sheetOpen} onClose={closeSheet}>
                {step === 'form' ? (
                    <View>
                        <Text style={styles.sheetTitle}>Add Resident</Text>
                        <Text style={styles.sheetSub}>They can sign in with this number right away.</Text>

                        <Text style={styles.fieldLabel}>Full name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={t => { setName(t); setFormError(''); }}
                            placeholder="e.g. Priya Sharma"
                            placeholderTextColor={SgateColors.t4}
                            autoCapitalize="words"
                            maxLength={60}
                        />

                        <Text style={styles.fieldLabel}>Mobile number</Text>
                        <View style={styles.phoneRow}>
                            <View style={styles.phonePrefix}>
                                <Text style={styles.phonePrefixText}>+91</Text>
                            </View>
                            <TextInput
                                style={[styles.input, styles.phoneInput]}
                                value={phone}
                                onChangeText={t => { setPhone(t.replace(/[^\d]/g, '').slice(0, 10)); setFormError(''); }}
                                placeholder="10-digit number"
                                placeholderTextColor={SgateColors.t4}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>

                        <Text style={styles.fieldLabel}>Flat</Text>
                        <TouchableOpacity
                            style={[styles.input, styles.selectField]}
                            onPress={() => { setFlatSearch(''); setStep('flat'); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.selectText, !selectedFlat && styles.selectPlaceholder]} numberOfLines={1}>
                                {selectedFlat
                                    ? [selectedFlat.block, selectedFlat.number].filter(Boolean).join(' · ')
                                    : 'Choose a flat'}
                            </Text>
                            <Feather name="chevron-right" size={18} color={SgateColors.t3} />
                        </TouchableOpacity>

                        <Text style={styles.fieldLabel}>Resident type</Text>
                        <View style={styles.typeRow}>
                            {TYPE_ORDER.map(t => {
                                const active = residentType === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeOption, active && styles.typeOptionActive]}
                                        onPress={() => { setResidentType(t); setFormError(''); }}
                                        activeOpacity={0.8}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: active }}
                                    >
                                        <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>
                                            {TYPE_STYLE[t].label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {residentType !== 'OWNER' && (
                            <Text style={styles.helper}>The flat needs an approved owner before tenants or family can be added.</Text>
                        )}

                        {!!formError && (
                            <View style={[styles.notice, styles.noticeError, styles.formError]}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={SgateColors.red} />
                                <Text style={styles.noticeText}>{formError}</Text>
                            </View>
                        )}

                        <View style={styles.sheetButtons}>
                            <PrimaryButton title="Cancel" variant="secondary" onPress={closeSheet} disabled={submitting} style={styles.sheetBtn} />
                            <PrimaryButton title="Add Resident" onPress={submitAdd} isLoading={submitting} style={styles.sheetBtn} />
                        </View>
                    </View>
                ) : (
                    <View>
                        <View style={styles.pickerHeader}>
                            <Pressable onPress={() => setStep('form')} hitSlop={10} style={styles.pickerBack} accessibilityLabel="Back to form">
                                <Feather name="arrow-left" size={20} color={SgateColors.t1} />
                            </Pressable>
                            <Text style={styles.sheetTitleInline}>Choose a flat</Text>
                        </View>
                        <View style={[styles.searchBox, styles.pickerSearch]}>
                            <Feather name="search" size={17} color={SgateColors.t3} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search block or flat number"
                                placeholderTextColor={SgateColors.t4}
                                value={flatSearch}
                                onChangeText={setFlatSearch}
                                autoCorrect={false}
                            />
                        </View>
                        <View style={styles.pickerList}>
                            {flatsState === 'loading' ? (
                                <View style={styles.pickerState}><ActivityIndicator color={SgateColors.goldDeep} /></View>
                            ) : flatsState === 'error' ? (
                                <View style={styles.pickerState}>
                                    <Text style={styles.pickerStateText}>Could not load flats.</Text>
                                    <PrimaryButton title="Retry" variant="outline" onPress={loadFlats} style={styles.retryBtn} />
                                </View>
                            ) : filteredFlats.length === 0 ? (
                                <View style={styles.pickerState}>
                                    <Text style={styles.pickerStateText}>
                                        {flatOptions.length === 0 ? 'No flats set up for this society yet.' : 'No flat matches your search.'}
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {filteredFlats.map(f => {
                                        const active = f.id === flatId;
                                        return (
                                            <TouchableOpacity
                                                key={f.id}
                                                style={[styles.flatRow, active && styles.flatRowActive]}
                                                onPress={() => { setFlatId(f.id); setFormError(''); setStep('form'); }}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialCommunityIcons name="home-outline" size={18} color={active ? SgateColors.goldDeep : SgateColors.t3} />
                                                <Text style={styles.flatRowText}>{f.number}</Text>
                                                <Text style={styles.flatRowBlock} numberOfLines={1}>{f.block}</Text>
                                                {active && <Feather name="check" size={18} color={SgateColors.goldDeep} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </AnimatedBottomSheetModal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Search (in header)
    searchWrap: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12 },
    searchBox: {
        ...SgateSurfaces.input,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1, paddingVertical: 0 },

    listContent: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 16, flexGrow: 1 },
    countText: { ...SgateTypography.microLabel, color: SgateColors.t3, marginTop: 18, marginBottom: 10 },

    notice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        marginTop: 12,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: '#FFE39A',
        backgroundColor: SgateColors.goldPale,
    },
    noticeError: { borderColor: SgateColors.redBorder, backgroundColor: SgateColors.redBg },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    // Card
    card: { ...SgateSurfaces.card, padding: 16, marginBottom: SgateLayout.cardGap },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardInfo: { flex: 1 },
    cardName: { ...SgateTypography.cardTitle, color: SgateColors.t1 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: SgateRadius.full },
    typePillText: { fontSize: 11, fontFamily: SgateFonts.bold },

    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        minHeight: 32,
    },
    metaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { flexShrink: 1, fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    primaryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SgateRadius.full, backgroundColor: SgateColors.goldPale },
    primaryBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    removeBtn: {
        minWidth: 128,
        height: 32,
        paddingHorizontal: 12,
        borderRadius: SgateRadius.full,
        borderWidth: 1,
        borderColor: SgateColors.redBorder,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.red },

    footerLoader: { paddingVertical: 20, alignItems: 'center' },

    // Sheet
    sheetTitle: { fontSize: 20, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    sheetTitleInline: { fontSize: 18, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    sheetSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 4, marginBottom: 4 },
    fieldLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginTop: 16, marginBottom: 8 },
    input: {
        ...SgateSurfaces.input,
        paddingHorizontal: 14,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    phoneRow: { flexDirection: 'row', gap: 10 },
    phonePrefix: { ...SgateSurfaces.input, width: 64, alignItems: 'center', justifyContent: 'center' },
    phonePrefixText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    phoneInput: { flex: 1 },
    selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    selectText: { flex: 1, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    selectPlaceholder: { color: SgateColors.t4 },
    typeRow: { flexDirection: 'row', gap: 10 },
    typeOption: {
        flex: 1,
        height: 44,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: SgateColors.border,
        backgroundColor: SgateColors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeOptionActive: { borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
    typeOptionText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    typeOptionTextActive: { fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    helper: { fontSize: 12, lineHeight: 17, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 8 },
    formError: { marginTop: 16 },
    sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 22 },
    sheetBtn: { flex: 1 },

    // Flat picker step
    pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pickerBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    pickerSearch: { marginTop: 14 },
    pickerList: { height: 320, marginTop: 10 },
    pickerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    pickerStateText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3, textAlign: 'center' },
    retryBtn: { minWidth: 140 },
    flatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 52,
        paddingHorizontal: 12,
        borderRadius: SgateRadius.sm,
    },
    flatRowActive: { backgroundColor: SgateColors.goldPale },
    flatRowText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    flatRowBlock: { flex: 1, fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
