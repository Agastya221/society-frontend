import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '../../components/ui/AppAlert';
import { Avatar } from '../../components/ui/Avatar';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
}

interface StaffMember {
    id: string;
    name: string;
    staffType: string;
    phone: string;
    photoUrl?: string;
    isVerified: boolean;
    status: 'INSIDE' | 'OUTSIDE';
}

interface Vehicle {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    model: string;
    color: string;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED';
    parkingSlot?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];

function formatGateId(id: string): string {
    const clean = id.replace(/-/g, '').slice(-6);
    return `#${clean.slice(0, 3)}${clean.slice(3)}`;
}

function formatStaffType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const STAFF_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    MAID: { bg: 'bg-blue-100', text: 'text-blue-700' },
    COOK: { bg: 'bg-orange-100', text: 'text-orange-700' },
    NANNY: { bg: 'bg-pink-100', text: 'text-pink-700' },
    DRIVER: { bg: 'bg-gray-200', text: 'text-gray-700' },
    CLEANER: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    GARDENER: { bg: 'bg-green-100', text: 'text-green-700' },
    LAUNDRY: { bg: 'bg-purple-100', text: 'text-purple-700' },
    CARETAKER: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    SECURITY_GUARD: { bg: 'bg-red-100', text: 'text-red-700' },
    OTHER: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const VEHICLE_STATUS: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-600', label: 'Rejected' },
};

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
    return (
        <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[20px] font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>{title}</Text>
            {onAdd && (
                <TouchableOpacity
                    onPress={onAdd}
                    activeOpacity={0.7}
                    className="bg-yellow-100 px-4 py-1.5 rounded-full"
                >
                    <Text className="text-[12px] font-bold text-yellow-800" style={{ fontFamily: 'Sora-Bold' }}>+ ADD</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Empty Card / Coming Soon ─────────────────────────────────────────────────

function EmptyCard({ icon, label, onAdd, comingSoon }: { icon: React.ReactNode; label: string; onAdd?: () => void, comingSoon?: boolean }) {
    return (
        <TouchableOpacity
            className={`w-full h-32 bg-gray-50/50 rounded-[24px] items-center justify-center ${comingSoon ? '' : 'border-dashed'}`}
            style={{
                borderWidth: comingSoon ? 1 : 1.5,
                borderColor: '#E5E7EB',
                borderStyle: comingSoon ? 'solid' : 'dashed',
            }}
            onPress={onAdd}
            activeOpacity={comingSoon ? 1 : 0.6}
            disabled={comingSoon}
        >
            <View className="items-center">
                <View className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center mb-2 shadow-sm">
                    {icon}
                </View>
                <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-tight" style={{ fontFamily: 'Sora-Bold' }}>
                    {comingSoon ? 'Coming Soon' : label}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HouseholdScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { profile } = useProfileStore();

    const [family, setFamily] = useState<FamilyMember[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [inviteVisible, setInviteVisible] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteRole, setInviteRole] = useState('SPOUSE');
    const [inviting, setInviting] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [familyRes, staffRes, vehicleRes] = await Promise.allSettled([
                api.get('/resident/family'),
                api.get('/staff/domestic'),
                api.get('/resident/vehicles'),
            ]);

            if (familyRes.status === 'fulfilled') {
                const d = familyRes.value.data;
                const arr = d?.data?.members ?? d?.data ?? d ?? [];
                setFamily(Array.isArray(arr) ? arr : []);
            }

            if (staffRes.status === 'fulfilled') {
                const d = staffRes.value.data;
                const arr = d?.data?.staff ?? d?.data?.members ?? d?.data ?? d ?? [];
                setStaff(Array.isArray(arr) ? arr : []);
            }

            if (vehicleRes.status === 'fulfilled') {
                const d = vehicleRes.value.data;
                const raw = d?.data?.vehicles ?? d?.data ?? d ?? [];
                const arr = Array.isArray(raw) ? raw : [];
                setVehicles(arr.map((v: any) => ({
                    id: v.id,
                    vehicleNumber: v.vehicleNumber ?? v.number ?? '',
                    vehicleType: v.vehicleType ?? v.type ?? 'Other',
                    model: v.model ?? '',
                    color: v.color ?? '',
                    status: v.status ?? 'PENDING',
                    parkingSlot: v.parkingSlot,
                })));
            }
        } catch (err) {
            console.error('HouseholdScreen fetchAll failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    const openInvite = () => {
        setInviteName('');
        setInvitePhone('');
        setInviteRole('SPOUSE');
        setInviteVisible(true);
    };

    const handleInvite = async () => {
        if (!inviteName.trim()) {
            AppAlert.show('Validation Error', 'A name is required to invite a family member.');
            return;
        }
        setInviting(true);
        try {
            let processedPhone = '';
            if (invitePhone.trim()) {
                const cleaned = invitePhone.replace(/\D/g, '');
                if (cleaned.length === 10) processedPhone = `+91${cleaned}`;
                else if (cleaned.startsWith('91') && cleaned.length > 10) processedPhone = `+${cleaned}`;
                else processedPhone = `+91${cleaned}`;
            }
            const payload: any = { name: inviteName.trim(), role: inviteRole };
            if (processedPhone) payload.phone = processedPhone;

            await api.post('/resident/family/invite', payload);
            setInviteVisible(false);
            AppAlert.show('Invitation Sent ✓', `${inviteName.trim()} has been added to your family.`);
            fetchAll();
        } catch (err: any) {
            AppAlert.show('Invite Failed', err?.response?.data?.message || 'Could not send invitation.');
        } finally {
            setInviting(false);
        }
    };

    const displayUser = profile ?? user as any;
    const flatNumber = displayUser?.flat?.number;
    const blockName = displayUser?.flat?.block?.name;
    const societyName = displayUser?.society?.name ?? displayUser?.flat?.block?.society?.name;
    const societyAddress = displayUser?.society?.address ?? displayUser?.flat?.block?.society?.address;

    const addressParts: string[] = [];
    if (flatNumber) addressParts.push(blockName ? `${blockName} ${flatNumber}` : flatNumber);
    if (societyName) addressParts.push(societyName);
    if (societyAddress) addressParts.push(societyAddress);
    const fullAddress = addressParts.join(', ') || 'No address available';

    const gateId = displayUser?.id ? formatGateId(displayUser.id) : '#------';

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center" style={{ paddingTop: insets.top }}>
                <ActivityIndicator size="large" color="#ca8a04" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View
                className="px-5 flex-row items-center justify-between bg-white border-b border-gray-100"
                style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Household</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ca8a04" colors={['#ca8a04']} />}
            >
                {/* Me Card */}
                <Animated.View entering={FadeInDown.delay(0).springify()} className="bg-white rounded-[24px] border border-gray-100 overflow-hidden mb-6 shadow-sm">
                    <View className="flex-row items-center p-4 py-5">
                        <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center mr-4">
                            <Ionicons name="person" size={28} color="#9ca3af" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[16px] font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>{displayUser?.name ?? 'Resident'} (Me)</Text>
                            <View className="bg-blue-100 rounded-full px-3 py-0.5 mt-1 self-start">
                                <Text className="text-[11px] font-bold text-blue-700">{gateId}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        className="flex-row items-center border-t border-gray-100 p-4 py-3"
                        onPress={() => Share.share({ message: fullAddress })}
                        activeOpacity={0.7}
                    >
                        <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center mr-3">
                            <Ionicons name="navigate-outline" size={14} color="#6b7280" />
                        </View>
                        <Text className="text-[14px] font-semibold text-gray-600" style={{ fontFamily: 'Sora-SemiBold' }}>Share My Address</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* My Family - Beautiful Unidimentional Cards */}
                <Animated.View entering={FadeInDown.delay(60).springify()} className="mb-8">
                    <SectionHeader title="My Family" onAdd={openInvite} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                        {family.map((member, idx) => (
                            <Animated.View key={member.id} entering={FadeInRight.delay(idx * 100).springify()}>
                                <TouchableOpacity
                                    className="bg-white rounded-[32px] border border-gray-100 w-44 h-52 overflow-hidden shadow-sm p-5 justify-between"
                                    onPress={() => router.push('/(resident)/family' as any)}
                                    activeOpacity={0.8}
                                >
                                    <View className="bg-blue-50 self-start px-2 py-0.5 rounded-lg">
                                        <Text className="text-[9px] font-bold text-blue-600 uppercase">{member.role}</Text>
                                    </View>
                                    <View className="items-center">
                                        <View className="w-20 h-20 rounded-full bg-yellow-50 items-center justify-center mb-4 border-4 border-white shadow-sm">
                                            <Text className="text-3xl font-bold text-yellow-700" style={{ fontFamily: 'Sora-Bold' }}>{member.name[0]}</Text>
                                        </View>
                                        <Text className="text-[15px] font-bold text-gray-900 text-center mb-1" numberOfLines={1} style={{ fontFamily: 'Sora-Bold' }}>{member.name}</Text>
                                        <Text className="text-[11px] font-medium text-gray-400">{formatGateId(member.id).toUpperCase()}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                        <TouchableOpacity
                            className="w-44 h-52 border-2 border-dashed border-gray-200 rounded-[32px] items-center justify-center"
                            onPress={openInvite}
                            activeOpacity={0.6}
                        >
                            <View className="w-12 h-12 rounded-full bg-yellow-50 items-center justify-center mb-3">
                                <Ionicons name="add" size={32} color="#ca8a04" />
                            </View>
                            <Text className="text-[14px] font-bold text-gray-400" style={{ fontFamily: 'Sora-Bold' }}>Add Member</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

                {/* My Pets - Coming Soon */}
                <Animated.View entering={FadeInDown.delay(100).springify()} className="mb-8">
                    <SectionHeader title="My Pets" />
                    <EmptyCard
                        comingSoon
                        icon={<MaterialCommunityIcons name="paw" size={24} color="#9ca3af" />}
                        label="Add Pet"
                    />
                </Animated.View>

                {/* My Daily Help */}
                <Animated.View entering={FadeInDown.delay(140).springify()} className="mb-8">
                    <SectionHeader title="My Daily Help" onAdd={() => router.push('/(resident)/staff' as any)} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {staff.map((member) => {
                            const tc = STAFF_TYPE_COLORS[member.staffType] ?? STAFF_TYPE_COLORS.OTHER;
                            return (
                                <TouchableOpacity
                                    key={member.id}
                                    className="bg-white rounded-[32px] border border-gray-100 w-40 h-52 overflow-hidden shadow-sm pt-6 pb-4 justify-between items-center px-3"
                                    onPress={() => router.push('/(resident)/staff' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Avatar name={member.name} size={64} />
                                    <View className="items-center w-full">
                                        <Text className="text-[15px] font-bold text-gray-900 text-center mb-1" numberOfLines={1} style={{ fontFamily: 'Sora-Bold' }}>{member.name}</Text>
                                        <View className={`rounded-full px-3 py-1 mb-2 ${tc.bg}`}>
                                            <Text className={`text-[10px] font-bold ${tc.text}`}>{formatStaffType(member.staffType).toUpperCase()}</Text>
                                        </View>
                                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'Sora-Bold' }}>Daily Helper</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            className="w-40 h-52 border-2 border-dashed border-gray-200 rounded-[32px] items-center justify-center"
                            onPress={() => router.push('/(resident)/staff' as any)}
                        >
                            <View className="w-12 h-12 rounded-full border-2 border-yellow-500 items-center justify-center">
                                <Ionicons name="add" size={28} color="#ca8a04" />
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

                {/* My Vehicles */}
                <Animated.View entering={FadeInDown.delay(180).springify()} className="mb-8">
                    <SectionHeader title="My Vehicles" onAdd={() => router.push('/(resident)/vehicles' as any)} />
                    <View className="gap-3">
                        {vehicles.map((v) => {
                            const sc = VEHICLE_STATUS[v.status] ?? VEHICLE_STATUS.PENDING;
                            return (
                                <TouchableOpacity
                                    key={v.id}
                                    className="bg-white rounded-[20px] border border-gray-100 p-4 flex-row items-center shadow-sm"
                                    onPress={() => router.push('/(resident)/vehicles' as any)}
                                    activeOpacity={0.8}
                                >
                                    <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-4">
                                        <MaterialCommunityIcons
                                            name={v.vehicleType.toUpperCase() === 'BIKE' ? 'motorbike' : 'car'}
                                            size={26}
                                            color="#3b82f6"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[15px] font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>{v.vehicleNumber}</Text>
                                        <Text className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Sora-Medium' }}>{v.model}{v.color ? ` · ${v.color}` : ''}</Text>
                                        {v.parkingSlot && (
                                            <Text className="text-[11px] text-gray-400 mt-0.5">Slot {v.parkingSlot}</Text>
                                        )}
                                    </View>
                                    <View className={`px-2.5 py-1 rounded-full ${sc.bg}`}>
                                        <Text className={`text-[10px] font-bold uppercase ${sc.text}`}>{sc.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            className="bg-gray-50/50 border border-gray-200 border-dashed rounded-[20px] p-4 flex-row items-center justify-center"
                            onPress={() => router.push('/(resident)/vehicles' as any)}
                        >
                            <Ionicons name="add" size={20} color="#9ca3af" />
                            <Text className="text-gray-400 font-bold ml-2">Add Vehicle</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Frequent Guests - Coming Soon */}
                <Animated.View entering={FadeInDown.delay(220).springify()} className="mb-6">
                    <SectionHeader title="Frequent Guests" />
                    <EmptyCard
                        comingSoon
                        icon={<Ionicons name="people-outline" size={24} color="#9ca3af" />}
                        label="Add Guest"
                    />
                </Animated.View>
            </ScrollView>

            <Modal
                visible={inviteVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setInviteVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <View
                        className="bg-white rounded-t-[32px] p-6 pb-10 shadow-2xl"
                        style={{ elevation: 20 }}
                    >
                        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Invite Family Member</Text>
                            <TouchableOpacity onPress={() => setInviteVisible(false)} className="p-2 bg-gray-100 rounded-full">
                                <Ionicons name="close" size={20} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Name *</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-900 text-base"
                            value={inviteName}
                            onChangeText={setInviteName}
                            placeholder="e.g. Anjali Sharma"
                            autoCapitalize="words"
                            placeholderTextColor="#9ca3af"
                        />

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Phone Number (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-900 text-base tracking-widest"
                            value={invitePhone}
                            onChangeText={setInvitePhone}
                            placeholder="10-digit mobile"
                            keyboardType="phone-pad"
                            placeholderTextColor="#9ca3af"
                        />

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Relationship</Text>
                        <View className="flex-row flex-wrap gap-2 mb-7">
                            {ROLES.map((r) => {
                                const selected = inviteRole === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setInviteRole(r)}
                                        className={`px-4 py-2 rounded-xl border-2 ${selected ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-200'}`}
                                        activeOpacity={0.7}
                                    >
                                        <Text className={`text-sm font-bold ${selected ? 'text-yellow-800' : 'text-gray-600'}`}>
                                            {r.charAt(0) + r.slice(1).toLowerCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            onPress={handleInvite}
                            disabled={inviting || !inviteName.trim()}
                            className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${inviting || !inviteName.trim() ? 'bg-gray-200' : 'bg-yellow-400'}`}
                            activeOpacity={0.8}
                        >
                            {inviting
                                ? <ActivityIndicator size="small" color="#000" />
                                : <Ionicons name="paper-plane" size={18} color={inviteName.trim() ? 'black' : '#9ca3af'} />
                            }
                            <Text className={`font-bold text-base ${inviting || !inviteName.trim() ? 'text-gray-400' : 'text-black'}`}>
                                {inviting ? 'Sending Invite…' : 'Send Invitation'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}