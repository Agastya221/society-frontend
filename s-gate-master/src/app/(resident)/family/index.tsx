import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SafeBottomSheetSurface } from '../../../components/ui/SafeBottomSheetSurface';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateLayout, SgateRadius, SgateSurfaces } from '../../../constants/Sgate-theme';

interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    role: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
    isActive: boolean;
}

const ROLES = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];

export default function FamilyScreen() {
    const insets = useSafeAreaInsets();
    const [family, setFamily] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Invite Modal State
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteRole, setInviteRole] = useState('SPOUSE');
    const [inviting, setInviting] = useState(false);

    const fetchFamily = async () => {
        try {
            const res = await api.get('/resident/family');
            setFamily(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch family:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFamily();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchFamily();
    };

    const handleInvite = async () => {
        if (!inviteName.trim()) {
            AppAlert.show('Validation Error', 'A name is required to invite family.');
            return;
        }

        setInviting(true);
        try {
            let processedPhone = '';
            if (invitePhone.trim()) {
                const cleaned = invitePhone.replace(/\D/g, ''); // strip to digits
                if (cleaned.length === 10) {
                    processedPhone = `+91${cleaned}`;
                } else if (cleaned.startsWith('91') && cleaned.length > 10) {
                    processedPhone = `+${cleaned}`;
                } else {
                    processedPhone = `+91${cleaned}`; // fallback assumption
                }
            }

            const payload: any = {
                name: inviteName.trim(),
                role: inviteRole,
            };
            if (processedPhone) payload.phone = processedPhone;

            await api.post('/resident/family/invite', payload);
            
            // Clean up UI and re-fetch properly
            setInviteModalVisible(false);
            setInviteName('');
            setInvitePhone('');
            setLoading(true);
            fetchFamily();

        } catch (err: any) {
            console.error(err);
            AppAlert.show('Invite Failed', err?.response?.data?.message || 'Could not send invitation.');
        } finally {
            setInviting(false);
        }
    };

    const renderItem = ({ item }: { item: FamilyMember }) => (
        <Card style={S.memberCard}>
             <View style={S.avatar}>
                 <Text style={S.avatarText}>{item.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={S.memberInfo}>
                <View style={S.nameRow}>
                    <Text style={S.memberName} numberOfLines={1}>{item.name}</Text>
                    {item.isActive && (
                        <View style={S.activeBadge}>
                            <View style={S.activeDot} />
                            <Text style={S.activeText}>ACTIVE</Text>
                        </View>
                    )}
                </View>
                <Text style={S.memberRole}>{item.role ? item.role.replace('_', ' ').toLowerCase() : 'family member'}</Text>
                {item.phone ? (
                    <Text style={S.memberPhone}>{item.phone}</Text>
                )  : null}
            </View>
        </Card>
    );

    const addButton = (
        <Pressable
            onPress={() => setInviteModalVisible(true)}
            style={({ pressed }) => [S.addButton, pressed && S.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Invite family member"
        >
            <Ionicons name="person-add" size={18} color={SgateColors.t1} />
        </Pressable>
    );

    return (
        <View style={S.root}>
            <ScreenHeader title="My Family" subtitle="People connected to your home" rightElement={addButton} />
            <View style={S.headerGap} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={family}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[S.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={S.empty}>
                            <View style={S.emptyIcon}><Ionicons name="people-outline" size={30} color={SgateColors.t3} /></View>
                            <Text style={S.emptyTitle}>No family members yet</Text>
                            <Text style={S.emptyText}>Invite someone so they can receive updates and help approve gate entries.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        family.length > 0 ? (
                            <View style={S.infoCard}>
                                <View style={S.infoHeader}>
                                    <Ionicons name="information-circle-outline" size={20} color={SgateColors.goldDeep} />
                                    <Text style={S.infoTitle}>Did you know?</Text>
                                </View>
                                <Text style={S.infoText}>
                                    Family members can approve gate entries and get notifications. Add them by tapping the + button above.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Invite Modal */}
            <Modal
                visible={inviteModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setInviteModalVisible(false)}
            >
                <KeyboardAvoidingView style={S.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setInviteModalVisible(false)} />
                    <SafeBottomSheetSurface style={S.inviteSheet} showHandle minimumBottomPadding={20}>
                        <View style={S.modalHeader}>
                            <View style={S.modalTitleWrap}>
                                <Text style={S.modalTitle}>Invite Family Member</Text>
                                <Text style={S.modalSubtitle}>Add someone connected to your home</Text>
                            </View>
                            <Pressable onPress={() => setInviteModalVisible(false)} style={S.closeButton} accessibilityLabel="Close invite form">
                                <Ionicons name="close" size={20} color={SgateColors.t2} />
                            </Pressable>
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={S.formContent}>
                            <Text style={S.fieldLabel}>NAME *</Text>
                            <TextInput style={S.input} value={inviteName} onChangeText={setInviteName} placeholder="e.g. Anjali Sharma" placeholderTextColor={SgateColors.t4} autoCapitalize="words" />

                            <Text style={S.fieldLabel}>PHONE NUMBER (OPTIONAL)</Text>
                            <TextInput style={S.input} value={invitePhone} onChangeText={setInvitePhone} placeholder="10-digit mobile" placeholderTextColor={SgateColors.t4} keyboardType="phone-pad" />

                            <Text style={S.fieldLabel}>RELATIONSHIP *</Text>
                            <View style={S.roleGrid}>
                                {ROLES.map((r) => {
                                    const isSelected = inviteRole === r;
                                    return (
                                        <Pressable key={r} onPress={() => setInviteRole(r)} style={[S.roleChip, isSelected && S.roleChipActive]} accessibilityRole="radio" accessibilityState={{ checked: isSelected }}>
                                            <Text style={[S.roleText, isSelected && S.roleTextActive]}>{r.charAt(0) + r.slice(1).toLowerCase()}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <PrimaryButton
                                title={inviting ? 'Sending invite…' : 'Send Invitation'}
                                onPress={handleInvite}
                                disabled={inviting || !inviteName.trim()}
                                isLoading={inviting}
                                leftIcon={<Ionicons name="paper-plane" size={18} color={SgateColors.t1} />}
                            />
                        </ScrollView>
                    </SafeBottomSheetSurface>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    headerGap: { height: SgateLayout.headerContentGap },
    addButton: { width: SgateLayout.iconButtonSize, height: SgateLayout.iconButtonSize, borderRadius: SgateLayout.iconButtonSize / 2, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.72 },
    listContent: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12, flexGrow: 1 },
    memberCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SgateLayout.cardGap },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    memberInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    memberName: { flexShrink: 1, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    memberRole: { marginTop: 3, fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3, textTransform: 'capitalize' },
    memberPhone: { marginTop: 4, fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: SgateRadius.full, backgroundColor: SgateColors.greenBg },
    activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SgateColors.green },
    activeText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.green },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 28 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 6 },
    emptyText: { fontSize: 13, lineHeight: 19, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },
    infoCard: { marginTop: 4, padding: 16, borderRadius: SgateRadius.md, backgroundColor: SgateColors.goldPale, borderWidth: 1, borderColor: '#FFE8A3' },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    infoTitle: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    infoText: { fontSize: 12, lineHeight: 18, fontFamily: SgateFonts.regular, color: SgateColors.t2 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,15,20,0.45)' },
    inviteSheet: { paddingHorizontal: SgateLayout.screenGutter },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    modalTitleWrap: { flex: 1, minWidth: 0 },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    modalSubtitle: { marginTop: 3, fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    formContent: { paddingTop: 18, paddingBottom: 4 },
    fieldLabel: { marginBottom: 8, fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.7 },
    input: { ...SgateSurfaces.input, paddingHorizontal: 15, marginBottom: 16, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    roleChip: { minHeight: 42, paddingHorizontal: 14, borderRadius: SgateRadius.sm, borderWidth: 1, borderColor: SgateColors.border, backgroundColor: SgateColors.card, alignItems: 'center', justifyContent: 'center' },
    roleChipActive: { borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
    roleText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    roleTextActive: { color: SgateColors.t1 },
});
