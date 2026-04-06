import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuthStore();

    // Maintenance config
    const [monthlyFee, setMonthlyFee]         = useState('2500');
    const [dueDayOfMonth, setDueDayOfMonth]   = useState('10');
    const [gracePeriod, setGracePeriod]       = useState('5');
    const [saving, setSaving]                 = useState(false);

    // Auto-approval toggles
    const [autoStaff, setAutoStaff]           = useState(false);
    const [autoDelivery, setAutoDelivery]     = useState(true);
    const [autoCab, setAutoCab]               = useState(false);

    const societyName    = user?.society?.name    ?? 'Your Society';
    const societyAddress = user?.society?.address ?? '—';
    const societyCity    = user?.society?.city    ?? '';

    const handleSave = async () => {
        if (!monthlyFee.trim() || isNaN(Number(monthlyFee))) {
            Alert.alert('Invalid Fee', 'Please enter a valid monthly fee.');
            return;
        }
        setSaving(true);
        // TODO: PATCH /admin/society/settings when API is available
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        Alert.alert('Saved', 'Society settings updated successfully.');
    };

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Society Settings</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
                            icon="user"
                            value={autoStaff}
                            onValueChange={setAutoStaff}
                        />
                        <ToggleRow
                            label="Auto-approve delivery agents"
                            sub="Amazon, Swiggy, Zomato etc."
                            icon="package"
                            value={autoDelivery}
                            onValueChange={setAutoDelivery}
                        />
                        <ToggleRow
                            label="Auto-approve registered cabs"
                            sub="Ola, Uber & other cab services"
                            icon="navigation"
                            value={autoCab}
                            onValueChange={setAutoCab}
                            isLast
                        />
                    </View>
                    <Text style={styles.hint}>Auto-approval settings will sync with the backend when available.</Text>
                </Animated.View>

                {/* ── Gate Points ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(240).springify()}>
                    <Text style={styles.sectionLabel}>GATE MANAGEMENT</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="map-pin"
                            label="Manage Gate Points"
                            sub="Configure entry/exit gates"
                            onPress={() => router.push('/(admin)/gate-points')}
                        />
                        <MenuItem
                            icon="users"
                            label="Guard Management"
                            sub="Add and manage security guards"
                            onPress={() => router.push('/(admin)/guards')}
                            isLast
                        />
                    </View>
                </Animated.View>

                {/* ── Danger Zone ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(320).springify()}>
                    <Text style={styles.sectionLabel}>MORE</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="download"
                            label="Export Society Data"
                            sub="Download resident & entry reports"
                            onPress={() => Alert.alert('Coming Soon', 'Data export feature is coming in the next update.')}
                            isLast
                        />
                    </View>
                </Animated.View>

                <Text style={styles.version}>Version 1.0.0 (Build 124)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
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
    label: string; sub: string; icon: keyof typeof Feather.glyphMap;
    value: boolean; onValueChange: (v: boolean) => void; isLast?: boolean;
}) {
    return (
        <View style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
            <View style={styles.toggleLeft}>
                <View style={styles.toggleIcon}>
                    <Feather name={icon} size={15} color={SgateColors.t2} />
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

function MenuItem({ icon, label, sub, onPress, isLast }: {
    icon: keyof typeof Feather.glyphMap; label: string; sub: string;
    onPress: () => void; isLast?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[styles.menuItem, !isLast && styles.menuItemBorder]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.menuLeft}>
                <View style={styles.menuIconWrap}>
                    <Feather name={icon} size={16} color={SgateColors.t3} />
                </View>
                <View>
                    <Text style={styles.menuLabel}>{label}</Text>
                    <Text style={styles.menuSub}>{sub}</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={18} color={SgateColors.t4} />
        </TouchableOpacity>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: 20, paddingHorizontal: 20 },

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
        backgroundColor: SgateColors.black,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

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
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    menuIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    menuSub: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 1 },

    version: { textAlign: 'center', fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 8 },
});
