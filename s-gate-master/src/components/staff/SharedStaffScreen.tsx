import { AppLoader } from '@/components/ui/AppLoader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { createDomesticStaff, DomesticStaffRole, getStaffAttendance, getStaffList, StaffAttendance, StaffMember, updateDomesticStaff } from '@/services/staffService';
import { uploadImage } from '@/services/uploadService';

const STAFF_ROLES: { value: DomesticStaffRole; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { value: 'MAID', label: 'House Help', icon: 'broom' },
    { value: 'COOK', label: 'Cook', icon: 'chef-hat' },
    { value: 'NANNY', label: 'Nanny', icon: 'baby-face-outline' },
    { value: 'DRIVER', label: 'Driver', icon: 'car-outline' },
    { value: 'CLEANER', label: 'Cleaner', icon: 'spray-bottle' },
    { value: 'GARDENER', label: 'Gardener', icon: 'flower-outline' },
    { value: 'LAUNDRY', label: 'Laundry', icon: 'washing-machine' },
    { value: 'CARETAKER', label: 'Caretaker', icon: 'account-heart-outline' },
    { value: 'SECURITY_GUARD', label: 'Security', icon: 'shield-account-outline' },
    { value: 'OTHER', label: 'Other', icon: 'account-outline' },
];

// Helpers
const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function SharedStaffScreen({ isTab = false }: { isTab?: boolean }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE'>('DIRECTORY');
    const [searchQuery, setSearchQuery] = useState('');
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [formVisible, setFormVisible] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<DomesticStaffRole>('MAID');
    const [photoUri, setPhotoUri] = useState('');
    const [photoChanged, setPhotoChanged] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [staffRes, attRes] = await Promise.all([
            getStaffList(),
            getStaffAttendance(new Date().toISOString().split('T')[0]),
        ]);
        setStaff(staffRes);
        setAttendance(attRes);
        setLoading(false);
    };

    const closeForm = () => {
        setFormVisible(false);
        setEditingStaff(null);
        setName('');
        setPhone('');
        setRole('MAID');
        setPhotoUri('');
        setPhotoChanged(false);
    };

    const openCreateForm = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingStaff(null);
        setName('');
        setPhone('');
        setRole('MAID');
        setPhotoUri('');
        setPhotoChanged(false);
        setFormVisible(true);
    };

    const openEditForm = (item: StaffMember) => {
        if (item.source !== 'DOMESTIC') return;
        setEditingStaff(item);
        setName(item.name);
        setPhone(item.phone);
        setRole(item.role as DomesticStaffRole);
        setPhotoUri(item.photoUrl || '');
        setPhotoChanged(false);
        setFormVisible(true);
    };

    const choosePhoto = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            AppAlert.show('Permission required', 'Allow photo access to select a clear staff face photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.65,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            setPhotoUri(result.assets[0].uri);
            setPhotoChanged(true);
        }
    };

    const saveStaff = async () => {
        const cleanName = name.trim();
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (!cleanName) return AppAlert.show('Name required', 'Enter the staff member’s full name.');
        if (cleanPhone.length !== 10) return AppAlert.show('Phone required', 'Enter a valid 10-digit phone number.');
        if (!photoUri) return AppAlert.show('Photo required', 'Add a clear face photo so guards and residents can identify the staff member.');

        setSaving(true);
        try {
            let photoUrl: string | undefined;
            if (photoChanged || !editingStaff) {
                photoUrl = await uploadImage(photoUri, { context: 'staff-photo' });
            }
            const input = { name: cleanName, phone: cleanPhone, staffType: role, ...(photoUrl ? { photoUrl } : {}) };
            if (editingStaff) await updateDomesticStaff(editingStaff.id, input);
            else await createDomesticStaff({ ...input, photoUrl: photoUrl! });
            closeForm();
            await loadData();
            AppAlert.show('Success', editingStaff ? 'Staff details updated.' : 'Staff added and ready to sign in.');
        } catch (error: any) {
            AppAlert.show('Failed', error?.response?.data?.message || error?.message || 'Could not save staff details.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStaffStatus = () => {
        if (!editingStaff) return;
        const activating = editingStaff.status !== 'ACTIVE';
        AppAlert.show(
            activating ? 'Activate staff?' : 'Deactivate staff?',
            activating ? 'They will be able to sign in again.' : 'They will immediately lose access to the staff app.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: activating ? 'Activate' : 'Deactivate',
                    style: activating ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            await updateDomesticStaff(editingStaff.id, { isActive: activating });
                            closeForm();
                            await loadData();
                        } catch (error: any) {
                            AppAlert.show('Failed', error?.response?.data?.message || 'Could not update staff access.');
                        }
                    },
                },
            ],
        );
    };

    const renderStaffCard = ({ item, index }: { item: StaffMember; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity style={styles.card} activeOpacity={0.97} onPress={() => openEditForm(item)} disabled={item.source !== 'DOMESTIC'}>
                <View style={styles.cardHeader}>
                    <Avatar name={item.name} photoUrl={item.photoUrl} size={46} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.staffName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.roleWrap}>
                            <Text style={styles.staffRole}>{item.role}</Text>
                            {item.phone && (
                                <>
                                    <View style={styles.roleDot} />
                                    <Text style={styles.staffPhone}>{item.phone}</Text>
                                </>
                            )}
                        </View>
                        {item.agencyName && (
                            <Text style={styles.agencyText} numberOfLines={1}>
                                Agency: {item.agencyName}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>
                            {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {item.source === 'DOMESTIC' && <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />}
                </View>

                <View style={styles.cardMetrics}>
                    <View style={styles.metric}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.shiftStart ? `${item.shiftStart} – ${item.shiftEnd}` : 'No shift'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <MaterialCommunityIcons name="briefcase-outline" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.salary ? `₹${item.salary.toLocaleString()}/mo` : 'Not set'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <MaterialCommunityIcons name="home-outline" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.assignedFlats?.length > 1 ? `${item.assignedFlats.length} Flats` : (item.assignedFlats?.[0] || 'Not assigned')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderAttendanceCard = ({ item, index }: { item: StaffMember; index: number }) => {
        const record = attendance.find(a => a.staffId === item.id);
        const statusColor = record?.status === 'PRESENT' ? SgateColors.green : record?.status === 'HALF_DAY' ? SgateColors.goldDeep : SgateColors.red;
        const statusBg = record?.status === 'PRESENT' ? SgateColors.greenBg : record?.status === 'HALF_DAY' ? SgateColors.goldPale : SgateColors.redBg;

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Avatar name={item.name} photoUrl={item.photoUrl} size={42} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.staffName}>{item.name}</Text>
                            <Text style={styles.staffRole}>{item.role}</Text>
                        </View>
                        {record ? (
                            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>{record.status.replace('_', ' ')}</Text>
                            </View>
                        ) : (
                            <View style={[styles.statusBadge, { backgroundColor: SgateColors.surface }]}>
                                <Text style={[styles.statusText, { color: SgateColors.t2 }]}>ABSENT YET</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.attTimes}>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>CHECK IN</Text>
                            <Text style={[styles.timeValue, !record?.checkInTime && { color: SgateColors.t3 }]}>
                                {formatTime(record?.checkInTime)}
                            </Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>CHECK OUT</Text>
                            <Text style={[styles.timeValue, !record?.checkOutTime && { color: SgateColors.t3 }]}>
                                {formatTime(record?.checkOutTime)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const filteredStaff = staff.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || 
               s.role.toLowerCase().includes(q) || 
               (s.phone && s.phone.includes(q));
    });

    return (
        <View style={styles.safe}>
            {/* Header + Tabs (single block, no gap) */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isTab && { marginLeft: 0 }]}>Staff</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={openCreateForm} accessibilityLabel="Add staff">
                        <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Segmented Control */}
                <View style={styles.tabWrapper}>
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[styles.segment, activeTab === 'DIRECTORY' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setActiveTab('DIRECTORY'); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, activeTab === 'DIRECTORY' && styles.segmentTextActive]}>Directory</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, activeTab === 'ATTENDANCE' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setActiveTab('ATTENDANCE'); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, activeTab === 'ATTENDANCE' && styles.segmentTextActive]}>Today&apos;s Logs</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Fixed Search Filter with soft cushion */}
            <View style={styles.fixedSearchWrap}>
                <View style={styles.searchWrap}>
                    <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t3} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, role, or phone..."
                        placeholderTextColor={SgateColors.t4}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialCommunityIcons name="close-circle" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filteredStaff}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={activeTab === 'DIRECTORY' ? renderStaffCard : renderAttendanceCard}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-group-outline" size={40} color={SgateColors.t4} />
                            <Text style={styles.emptyText}>No staff records found</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={formVisible} animationType="slide" transparent onRequestClose={closeForm}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeForm} />
                    <View style={[styles.formSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.formHeader}>
                            <View>
                                <Text style={styles.formTitle}>{editingStaff ? 'Edit staff' : 'Add staff member'}</Text>
                                <Text style={styles.formSubtitle}>Admin registration gives immediate app access</Text>
                            </View>
                            <Pressable style={styles.closeButton} onPress={closeForm} accessibilityLabel="Close form">
                                <MaterialCommunityIcons name="close" size={20} color={SgateColors.t2} />
                            </Pressable>
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
                            <Pressable style={styles.photoPicker} onPress={choosePhoto}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
                                ) : (
                                    <View style={styles.photoPlaceholder}><MaterialCommunityIcons name="camera-plus-outline" size={30} color={SgateColors.goldDeep} /></View>
                                )}
                                <View style={styles.photoCopy}>
                                    <Text style={styles.photoTitle}>{photoUri ? 'Change face photo' : 'Add face photo'}</Text>
                                    <Text style={styles.photoHint}>Use a clear, front-facing photo</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={SgateColors.t4} />
                            </Pressable>

                            <Text style={styles.fieldLabel}>FULL NAME</Text>
                            <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="e.g. Sunita Devi" placeholderTextColor={SgateColors.t4} autoCapitalize="words" />
                            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                            <TextInput style={styles.formInput} value={phone} onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" placeholderTextColor={SgateColors.t4} keyboardType="phone-pad" maxLength={10} />
                            <Text style={styles.fieldLabel}>ROLE</Text>
                            <View style={styles.roleGrid}>
                                {STAFF_ROLES.map(option => (
                                    <Pressable key={option.value} style={[styles.roleChip, role === option.value && styles.roleChipActive]} onPress={() => setRole(option.value)}>
                                        <MaterialCommunityIcons name={option.icon} size={17} color={role === option.value ? SgateColors.goldDeep : SgateColors.t3} />
                                        <Text style={[styles.roleChipText, role === option.value && styles.roleChipTextActive]}>{option.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                            <View style={styles.accessNote}>
                                <MaterialCommunityIcons name="check-decagram" size={20} color={SgateColors.green} />
                                <Text style={styles.accessNoteText}>This number is verified automatically and can sign in to the Staff app immediately.</Text>
                            </View>
                            {editingStaff && (
                                <Pressable style={[styles.statusAction, editingStaff.status === 'ACTIVE' && styles.deactivateAction]} onPress={toggleStaffStatus}>
                                    <MaterialCommunityIcons name={editingStaff.status === 'ACTIVE' ? 'account-off-outline' : 'account-check-outline'} size={19} color={editingStaff.status === 'ACTIVE' ? SgateColors.red : SgateColors.green} />
                                    <Text style={[styles.statusActionText, { color: editingStaff.status === 'ACTIVE' ? SgateColors.red : SgateColors.green }]}>{editingStaff.status === 'ACTIVE' ? 'Deactivate app access' : 'Reactivate app access'}</Text>
                                </Pressable>
                            )}
                            <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveStaff} disabled={saving}>
                                {saving ? <ActivityIndicator color={SgateColors.t1} /> : <Text style={styles.saveButtonText}>{editingStaff ? 'Save changes' : 'Add & activate staff'}</Text>}
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    // Header wrapper (contains header row + tabs as one block)
    headerWrapper: {
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },

    // ── Tabs ─────────────────────────────────────────────────────
    tabWrapper: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
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

    fixedSearchWrap: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 6,
        backgroundColor: SgateColors.bg,
        zIndex: 5,
    },

    list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
    
    // Search Box
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardInfo: { flex: 1 },
    staffName: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    roleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    staffRole: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    roleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: SgateColors.t4 },
    staffPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    agencyText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 4 },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusActive: { backgroundColor: '#E8F8F1' },
    statusInactive: { backgroundColor: SgateColors.redBg },
    statusText: { fontSize: 11, fontFamily: SgateFonts.semibold },
    statusTextActive: { color: '#16A34A' },
    statusTextInactive: { color: SgateColors.red },

    cardMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metricText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    attTimes: { flexDirection: 'row', gap: 12, marginTop: 16 },
    timeBox: { flex: 1, backgroundColor: SgateColors.bg, borderRadius: 12, padding: 12, alignItems: 'center' },
    timeLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, marginBottom: 4 },
    timeValue: { fontSize: 15, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },

    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t3, marginTop: 12 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,15,20,0.45)' },
    formSheet: { maxHeight: '92%', backgroundColor: SgateColors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
    sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: SgateColors.borderSoft, alignSelf: 'center', marginTop: 10 },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    formTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    formSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    formContent: { padding: 20, paddingBottom: 30 },
    photoPicker: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.borderSoft, marginBottom: 20 },
    photoPreview: { width: 58, height: 58, borderRadius: 16 },
    photoPlaceholder: { width: 58, height: 58, borderRadius: 16, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    photoCopy: { flex: 1, marginLeft: 12 },
    photoTitle: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    photoHint: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 3 },
    fieldLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.7, marginBottom: 7, marginTop: 4 },
    formInput: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: SgateColors.borderSoft, backgroundColor: SgateColors.bg, paddingHorizontal: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 16 },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 38, borderRadius: 12, backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.borderSoft },
    roleChipActive: { backgroundColor: SgateColors.goldPale, borderColor: SgateColors.gold },
    roleChipText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    roleChipTextActive: { color: SgateColors.t1 },
    accessNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 13, backgroundColor: SgateColors.greenBg, marginBottom: 16 },
    accessNoteText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    statusAction: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: SgateColors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
    deactivateAction: { borderColor: SgateColors.red },
    statusActionText: { fontSize: 14, fontFamily: SgateFonts.bold },
    saveButton: { height: 52, borderRadius: 15, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
    saveButtonDisabled: { opacity: 0.65 },
    saveButtonText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
