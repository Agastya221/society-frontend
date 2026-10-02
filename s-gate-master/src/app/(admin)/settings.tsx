import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SgateColors, SgateFonts, SgateLayout, SgateTypography } from '@/constants/Sgate-theme';
import { SettingRow } from '@/components/ui/SettingRow';
import { useAuthStore } from '@/store/useAuthStore';
import { getSocietySettings, updateSocietySettings, type SocietySettings } from '@/services/settings.service';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {

    const router = useRouter();
    const { user } = useAuthStore();
    // The admin's active society, for when the profile carries no society.
    const adminContext = useAuthStore(state =>
        state.userContexts.find(c => c.membershipId === state.selectedAdminContextId));

    // Maintenance config: empty until loaded, never made-up numbers.
    const [monthlyFee, setMonthlyFee]         = useState('');
    const [dueDayOfMonth, setDueDayOfMonth]   = useState('');
    const [gracePeriod, setGracePeriod]       = useState('');
    const [saving, setSaving]                 = useState(false);
    const [server, setServer]                 = useState<SocietySettings | null>(null);
    /** null while loading; false when the server has no settings API yet. */
    const [available, setAvailable]           = useState<boolean | null>(null);

    // Auto-approval toggles
    const [autoStaff, setAutoStaff]           = useState(false);
    const [autoDelivery, setAutoDelivery]     = useState(false);
    const [autoCab, setAutoCab]               = useState(false);

    const applySettings = (data: SocietySettings) => {
        setServer(data);
        setMonthlyFee(data.maintenance.monthlyFee != null ? String(data.maintenance.monthlyFee) : '');
        setDueDayOfMonth(String(data.maintenance.dueDayOfMonth));
        setGracePeriod(String(data.maintenance.gracePeriodDays));
        setAutoStaff(data.autoApproval.domesticStaff);
        setAutoDelivery(data.autoApproval.delivery);
        setAutoCab(data.autoApproval.cab);
    };

    useFocusEffect(useCallback(() => {
        let active = true;
        getSocietySettings()
            .then(data => { if (active) { applySettings(data); setAvailable(true); } })
            .catch(() => { if (active) setAvailable(false); });
        return () => { active = false; };
    }, []));

    const societyName    = server?.society.name    ?? user?.society?.name    ?? adminContext?.societyName ?? '—';
    const societyAddress = server?.society.address ?? user?.society?.address ?? '—';
    const societyCity    = server?.society.city    ?? user?.society?.city    ?? adminContext?.societyCity ?? '';

    const save = async (update: Parameters<typeof updateSocietySettings>[0], successMessage?: string) => {
        if (!available) {
            AppAlert.show('Not available yet', 'Saving society settings needs a server update. Nothing was changed.');
            return false;
        }
        try {
            applySettings(await updateSocietySettings(update));
            if (successMessage) AppAlert.show('Saved', successMessage);
            return true;
        } catch (err: any) {
            AppAlert.show('Could not save', err?.response?.data?.message || 'Please try again.');
            return false;
        }
    };

    const handleSave = async () => {
        const fee = Number(monthlyFee);
        const due = Number(dueDayOfMonth);
        const grace = Number(gracePeriod);
        if (!monthlyFee.trim() || !Number.isFinite(fee) || fee <= 0) {
            AppAlert.show('Invalid Fee', 'Please enter a valid monthly fee.');
            return;
        }
        if (!Number.isInteger(due) || due < 1 || due > 28) {
            AppAlert.show('Invalid Due Day', 'Due day must be between 1 and 28, so it exists in every month.');
            return;
        }
        if (!Number.isInteger(grace) || grace < 0 || grace > 30) {
            AppAlert.show('Invalid Grace Period', 'Grace period must be between 0 and 30 days.');
            return;
        }
        setSaving(true);
        await save({ maintenance: { monthlyFee: fee, dueDayOfMonth: due, gracePeriodDays: grace } },
            'Society settings updated successfully.');
        setSaving(false);
    };

    /** Flip a toggle right away, and roll it back if the server refuses. */
    const toggle = (key: keyof SocietySettings['autoApproval'], next: boolean, set: (v: boolean) => void) => {
        set(next);
        save({ autoApproval: { [key]: next } }).then(ok => { if (!ok) set(!next); });
    };

    return (
        <View style={[styles.safe]}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <ScreenHeader title="Society Settings" onBack={() => router.back()} />

            {/* ── Spacer ──────────────────────────────────────────────────── */}
            <View style={styles.spacer} />

            {/* Edge-to-edge Android no longer resizes for the keyboard; without this, Save sat under it. */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── Society Information ──────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()}>
                    <Text style={styles.sectionLabel}>SOCIETY INFORMATION</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Name"    value={societyName} />
                        <InfoRow label="Address" value={societyAddress} />
                        {societyCity ? <InfoRow label="City" value={societyCity} /> : null}
                    </View>
                    <Text style={styles.hint}>Society info is managed by Super Admin.</Text>
                </Animated.View>

                {/* ── Maintenance Configuration ─────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(80).springify()}>
                    <Text style={styles.sectionLabel}>MAINTENANCE CONFIGURATION</Text>
                    <View style={styles.card}>
                        <ConfigInput
                            label="Monthly Fee (₹)"
                            value={monthlyFee}
                            onChangeText={setMonthlyFee}
                            keyboardType="numeric"
                            placeholder="e.g. 2500"
                        />
                        <ConfigInput
                            label="Due Day of Month"
                            value={dueDayOfMonth}
                            onChangeText={setDueDayOfMonth}
                            keyboardType="numeric"
                            placeholder="1 – 28"
                        />
                        <ConfigInput
                            label="Grace Period (days)"
                            value={gracePeriod}
                            onChangeText={setGracePeriod}
                            keyboardType="numeric"
                            placeholder="e.g. 5"
                        />
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Text style={styles.saveBtnText}>Save Changes</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Auto-Approval Rules ───────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(160).springify()}>
                    <Text style={styles.sectionLabel}>AUTO-APPROVAL RULES</Text>
                    <View style={styles.toggleCard}>
                        <ToggleRow
                            label="Auto-approve domestic staff"
                            sub="Daily helpers bypass manual approval"
                            icon="account-outline"
                            value={autoStaff}
                            onValueChange={v => toggle('domesticStaff', v, setAutoStaff)}
                        />
                        <ToggleRow
                            label="Auto-approve delivery agents"
                            sub="Amazon, Swiggy, Zomato etc."
                            icon="package-variant"
                            value={autoDelivery}
                            onValueChange={v => toggle('delivery', v, setAutoDelivery)}
                        />
                        <ToggleRow
                            label="Auto-approve registered cabs"
                            sub="Ola, Uber & other cab services"
                            icon="car-outline"
                            value={autoCab}
                            onValueChange={v => toggle('cab', v, setAutoCab)}
                            isLast
                        />
                    </View>
                    {available === false && (
                        <Text style={styles.hint}>These settings can&apos;t be saved until the server is updated.</Text>
                    )}
                </Animated.View>

                {/* ── Gate Points ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(240).springify()}>
                    <Text style={styles.sectionLabel}>GATE MANAGEMENT</Text>
                    <View style={styles.menuCard}>
                        <SettingRow
                            icon="map-marker-outline"
                            title="Manage Gate Points"
                            subtitle="Configure entry/exit gates"
                            onPress={() => router.push('/(admin)/gate-points')}
                        />
                        <SettingRow
                            icon="account-group-outline"
                            title="Guard Management"
                            subtitle="Add and manage security guards"
                            onPress={() => router.push('/(admin)/guards')}
                            showDivider={false}
                        />
                    </View>
                </Animated.View>

                {/* ── Danger Zone ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(320).springify()}>
                    <Text style={styles.sectionLabel}>MORE</Text>
                    <View style={styles.menuCard}>
                        <SettingRow
                            icon="download-outline"
                            title="Export Society Data"
                            subtitle="Download resident & entry reports"
                            onPress={() => AppAlert.show('Coming Soon', 'Data export feature is coming in the next update.')}
                            showDivider={false}
                        />
                    </View>
                </Animated.View>

                <Text style={styles.version}>Version 1.0.0 (Build 124)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
        </View>
    );
}

function ConfigInput({ label, value, onChangeText, keyboardType, placeholder }: {
    label: string; value: string; onChangeText: (t: string) => void;
    keyboardType?: 'numeric' | 'default'; placeholder?: string;
}) {
    return (
        <View style={styles.configInputWrap}>
            <Text style={styles.configLabel}>{label}</Text>
            <TextInput
                style={styles.configInput}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType ?? 'default'}
                placeholder={placeholder}
                placeholderTextColor={SgateColors.t4}
            />
        </View>
    );
}

function ToggleRow({ label, sub, icon, value, onValueChange, isLast }: {
    label: string; sub: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    value: boolean; onValueChange: (v: boolean) => void; isLast?: boolean;
}) {
    return (
        <View style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
            <View style={styles.toggleLeft}>
                <View style={styles.toggleIcon}>
                    <MaterialCommunityIcons name={icon} size={16} color={SgateColors.t2} />
                </View>
                <View style={styles.toggleTexts}>
                    <Text style={styles.toggleLabel}>{label}</Text>
                    <Text style={styles.toggleSub}>{sub}</Text>
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: SgateColors.border, true: SgateColors.green }}
                thumbColor={SgateColors.card}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

    spacer: { height: 6 },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 14, paddingHorizontal: SgateLayout.screenGutter },

    sectionLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        marginBottom: 10,
        marginTop: 4,
    },
    hint: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 6, marginBottom: 20 },

    // Info card
    infoCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    infoLabel: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    infoValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, flex: 1, textAlign: 'right', marginLeft: 16 },

    // Config card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 20,
        gap: 14,
    },
    configInputWrap: { gap: 6 },
    configLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5, textTransform: 'uppercase' },
    configInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    saveBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Toggle card
    toggleCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14,
        marginBottom: 4,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
    toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    toggleIcon: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    toggleTexts: { flex: 1 },
    toggleLabel: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    toggleSub: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 1 },

    // Menu card
    menuCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14,
        marginBottom: 20,
    },

    version: { textAlign: 'center', fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 8 },
});
