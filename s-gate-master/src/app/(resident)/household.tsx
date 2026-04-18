import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '../../components/ui/AppAlert';
import { Avatar } from '../../components/ui/Avatar';
import api from '../../services/api';
import * as profileService from '../../services/profile.service';
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
    make?: string;
    model: string;
    color: string;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED';
    parkingSlot?: string;
    stickerNumber?: string;
    lastSeen?: string;
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
                <TouchableOpacity onPress={onAdd} activeOpacity={0.7} className="bg-yellow-100 px-4 py-1.5 rounded-full">
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
            style={{ borderWidth: comingSoon ? 1 : 1.5, borderColor: '#E5E7EB', borderStyle: comingSoon ? 'solid' : 'dashed' }}
            onPress={onAdd}
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

    // Modal states
    const [inviteVisible, setInviteVisible] = useState(false);
    const [detailMember, setDetailMember] = useState<FamilyMember | null>(null);
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteRole, setInviteRole] = useState('SPOUSE');
    const [inviting, setInviting] = useState(false);
    const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

    // Add Vehicle Form states
    const [addVehicleVisible, setAddVehicleVisible] = useState(false);
    const [newVehicleType, setNewVehicleType] = useState<'Car' | 'Bike' | 'Other' | null>(null);
    const [newVehicleNumber, setNewVehicleNumber] = useState('');
    const [newVehicleModel, setNewVehicleModel] = useState('');
    const [newVehicleColor, setNewVehicleColor] = useState('');
    const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

    const handleInvite = async () => {
        if (!inviteName.trim() || inviting) return;
        setInviting(true);
        try {
            await profileService.inviteFamilyMember({
                name: inviteName.trim(),
                phone: invitePhone.trim(),
                familyRole: inviteRole as any,
            });
            AppAlert.show('Success', `Invitation sent to ${inviteName}`);
            setInviteVisible(false);
            setInviteName('');
            setInvitePhone('');
            setInviteRole('SPOUSE');
            fetchAll();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    const fetchAll = useCallback(async () => {
        try {
            const [familyRes, staffRes, vehicleRes] = await Promise.allSettled([
                api.get('/resident/family'),
                api.get('/staff/domestic'),
                api.get('/resident/vehicles/my'),
            ]);

            if (familyRes.status === 'fulfilled') {
                const d = familyRes.value.data;
                setFamily(d?.data?.members ?? d?.data ?? d ?? []);
            }
            if (staffRes.status === 'fulfilled') {
                const d = staffRes.value.data;
                setStaff(d?.data?.staff ?? d?.data?.members ?? d?.data ?? d ?? []);
            }
            if (vehicleRes.status === 'fulfilled') {
                const d = vehicleRes.value.data;
                const raw = d?.data?.vehicles ?? d?.data ?? d ?? [];
                setVehicles(Array.isArray(raw) ? raw.map((v: any) => ({
                    id: v.id,
                    vehicleNumber: v.vehicleNumber ?? v.number ?? v.plateNumber ?? '',
                    vehicleType: v.vehicleType ?? v.type ?? 'Other',
                    make: v.make ?? '',
                    model: v.model ?? '',
                    color: v.color ?? '',
                    status: v.status ?? 'PENDING',
                    parkingSlot: v.parkingSlot,
                    stickerNumber: v.stickerNumber ?? v.sticker ?? undefined,
                    lastSeen: v.lastSeen ?? undefined,
                })) : []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleRegisterVehicle = async () => {
        if (!newVehicleType || !newVehicleNumber.trim() || !newVehicleModel.trim() || !newVehicleColor.trim() || vehicleSubmitting) return;

        const normalisedNumber = newVehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
        setVehicleSubmitting(true);
        try {
            await api.post('/resident/vehicles', {
                vehicleNumber: normalisedNumber,
                vehicleType: newVehicleType,
                model: newVehicleModel.trim(),
                color: newVehicleColor.trim(),
            });

            AppAlert.show(
                'Success',
                'Vehicle registration submitted for approval.',
                [{ text: 'OK', onPress: () => {
                    setAddVehicleVisible(false);
                    setNewVehicleType(null);
                    setNewVehicleNumber('');
                    setNewVehicleModel('');
                    setNewVehicleColor('');
                    fetchAll();
                }}]
            );
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to register vehicle');
        } finally {
            setVehicleSubmitting(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

    const displayUser = profile ?? user as any;
    const gateId = displayUser?.id ? formatGateId(displayUser.id) : '#------';

    if (loading) return <View className="flex-1 bg-gray-50 items-center justify-center"><ActivityIndicator size="large" color="#ca8a04" /></View>;

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
                <View className="px-5 flex-row items-center justify-between bg-white border-b border-gray-100" style={{ paddingTop: 12, paddingBottom: 16 }}>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Household</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchAll();}} />}>
                
                {/* Me Card */}
                <Animated.View entering={FadeInDown.springify()} className="bg-white rounded-[24px] border border-gray-100 overflow-hidden mb-6 shadow-sm">
                    <View className="flex-row items-center p-4 py-5">
                        <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center mr-4">
                            <Ionicons name="person" size={28} color="#9ca3af" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[16px] font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>{displayUser?.name} (Me)</Text>
                            <View className="bg-blue-100 rounded-full px-3 py-0.5 mt-1 self-start">
                                <Text className="text-[11px] font-bold text-blue-700">{gateId}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* My Family - Unified sizing and Detail Trigger */}
                <Animated.View entering={FadeInDown.delay(60).springify()} className="mb-8">
                    <SectionHeader title="My Family" onAdd={() => setInviteVisible(true)} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {family.map((member, idx) => (
                            <Animated.View key={member.id} entering={FadeInRight.delay(idx * 100).springify()}>
                                <TouchableOpacity
                                    className="bg-white rounded-[32px] border border-gray-100 w-44 h-52 overflow-hidden shadow-sm p-5 justify-between"
                                    onPress={() => setDetailMember(member)}
                                    activeOpacity={0.8}
                                >
                                    <View className="bg-blue-50 self-start px-2 py-0.5 rounded-lg">
                                        <Text className="text-[9px] font-bold text-blue-600 uppercase">{member.role}</Text>
                                    </View>
                                    <View className="items-center">
                                        <View className="w-20 h-20 rounded-full bg-yellow-50 items-center justify-center mb-4 border-4 border-white shadow-sm">
                                            <Text className="text-3xl font-bold text-yellow-700">{member.name[0]}</Text>
                                        </View>
                                        <Text className="text-[15px] font-bold text-gray-900 text-center mb-1" numberOfLines={1}>{member.name}</Text>
                                        <Text className="text-[11px] font-medium text-gray-400">{formatGateId(member.id).toUpperCase()}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                        <TouchableOpacity className="w-44 h-52 border-2 border-dashed border-gray-200 rounded-[32px] items-center justify-center" onPress={() => setInviteVisible(true)}>
                            <View className="w-12 h-12 rounded-full bg-yellow-50 items-center justify-center mb-3">
                                <Ionicons name="add" size={32} color="#ca8a04" />
                            </View>
                            <Text className="text-[14px] font-bold text-gray-400">Add Member</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

                {/* Pets - Coming Soon */}
                <Animated.View entering={FadeInDown.delay(100).springify()} className="mb-8">
                    <SectionHeader title="My Pets" />
                    <EmptyCard comingSoon icon={<MaterialCommunityIcons name="paw" size={24} color="#9ca3af" />} label="Add Pet" />
                </Animated.View>

                {/* Daily Help */}
                <Animated.View entering={FadeInDown.delay(140).springify()} className="mb-8">
                    <SectionHeader title="My Daily Help" onAdd={() => router.push('/(resident)/staff' as any)} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {staff.map((member) => {
                            const tc = STAFF_TYPE_COLORS[member.staffType] ?? STAFF_TYPE_COLORS.OTHER;
                            return (
                                <TouchableOpacity key={member.id} className="bg-white rounded-[32px] border border-gray-100 w-40 h-52 overflow-hidden shadow-sm p-5 justify-between items-center" onPress={() => router.push('/(resident)/staff' as any)} activeOpacity={0.8}>
                                    <Avatar name={member.name} size={64} />
                                    <View className="items-center w-full">
                                        <Text className="text-[15px] font-bold text-gray-900 text-center mb-1" numberOfLines={1}>{member.name}</Text>
                                        <View className={`rounded-full px-3 py-1 mb-2 ${tc.bg}`}><Text className={`text-[10px] font-bold ${tc.text}`}>{formatStaffType(member.staffType).toUpperCase()}</Text></View>
                                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Helper</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity className="w-40 h-52 border-2 border-dashed border-gray-200 rounded-[32px] items-center justify-center" onPress={() => router.push('/(resident)/staff' as any)}>
                            <Ionicons name="add" size={28} color="#ca8a04" />
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

                {/* Vehicles */}
                <Animated.View entering={FadeInDown.delay(180).springify()} className="mb-8">
                    <SectionHeader title="My Vehicles" onAdd={() => setAddVehicleVisible(true)} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {vehicles.map((v, idx) => {
                            const sc = VEHICLE_STATUS[v.status] ?? VEHICLE_STATUS.PENDING;
                            const isBike = v.vehicleType.toUpperCase() === 'BIKE';
                            return (
                                <Animated.View key={v.id} entering={FadeInRight.delay(idx * 100).springify()}>
                                    <TouchableOpacity 
                                        className="bg-white rounded-[32px] border border-gray-100 w-44 h-52 overflow-hidden shadow-sm p-5 justify-between" 
                                        onPress={() => setDetailVehicle(v)} 
                                        activeOpacity={0.8}
                                    >
                                        <View className={`${sc.bg} self-start px-2 py-0.5 rounded-lg`}>
                                            <Text className={`text-[9px] font-bold ${sc.text} uppercase`}>{sc.label}</Text>
                                        </View>
                                        <View className="items-center">
                                            <View className="w-20 h-20 rounded-full bg-blue-50/80 items-center justify-center mb-3 border-[5px] border-white shadow-md">
                                                <MaterialCommunityIcons name={isBike ? 'motorbike' : 'car-sports'} size={42} color="#2563eb" />
                                            </View>
                                            <Text className="text-[15px] font-bold text-gray-900 text-center mb-1" numberOfLines={1}>{v.vehicleNumber}</Text>
                                            <Text className="text-[11px] font-medium text-gray-400 text-center" numberOfLines={1}>{v.model || v.vehicleType}</Text>
                                        </View>
                                        <View className="flex-row items-center justify-center gap-1.5">
                                            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color?.toLowerCase() || '#E5E7EB' }} />
                                            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{v.color || 'Color'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                        <TouchableOpacity className="w-44 h-52 border-2 border-dashed border-gray-200 rounded-[32px] items-center justify-center" onPress={() => setAddVehicleVisible(true)}>
                            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-3 shadow-inner">
                                <Ionicons name="add-circle" size={32} color="#3b82f6" />
                            </View>
                            <Text className="text-[14px] font-bold text-gray-400">Add Vehicle</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

                {/* Frequent Guests - Coming Soon */}
                <Animated.View entering={FadeInDown.delay(220).springify()} className="mb-6">
                    <SectionHeader title="Frequent Guests" />
                    <EmptyCard comingSoon icon={<Ionicons name="people-outline" size={24} color="#9ca3af" />} label="Add Guest" />
                </Animated.View>
            </ScrollView>

            {/* Member Detail Pop-up */}
            <Modal visible={!!detailMember} transparent animationType="fade" onRequestClose={() => setDetailMember(null)}>
                <TouchableWithoutFeedback onPress={() => setDetailMember(null)}>
                    <View className="flex-1 bg-black/60 items-center justify-center px-6">
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <Animated.View entering={FadeIn.duration(300)} className="bg-white w-full rounded-[40px] overflow-hidden">
                                <View className="flex-row justify-between p-6 pb-0">
                                    <TouchableOpacity onPress={() => setDetailMember(null)} className="p-2 bg-gray-100 rounded-full"><Ionicons name="close" size={20} color="#4b5563" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => setDetailMember(null)} className="p-2 bg-red-50 rounded-full"><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
                                </View>
                                <View className="items-center px-6 pt-2 pb-8">
                                    <View className="w-32 h-32 rounded-full bg-gray-100 items-center justify-center mb-6"><Ionicons name="people" size={60} color="#9ca3af" /></View>
                                    <Text className="text-2xl font-bold text-gray-900 mb-2 text-center" style={{ fontFamily: 'Sora-Bold' }}>{detailMember?.name}</Text>
                                    <View className="flex-row items-center gap-2 mb-2">
                                        <View className="bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100"><Text className="text-lg font-bold text-blue-600 tracking-widest">{detailMember ? formatGateId(detailMember.id) : ''}</Text></View>
                                        <Ionicons name="help-circle-outline" size={18} color="#9ca3af" />
                                    </View>
                                    <Text className="text-gray-500 text-lg mb-1">{detailMember?.phone || 'No phone number'}</Text>
                                    <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px]">{detailMember?.role}</Text>
                                </View>
                                <TouchableOpacity onPress={() => detailMember?.phone && Linking.openURL(`tel:${detailMember.phone}`)} className="bg-yellow-400 flex-row items-center justify-center py-5 gap-3">
                                    <Ionicons name="call" size={24} color="black" />
                                    <Text className="text-xl font-bold text-black" style={{ fontFamily: 'Sora-Bold' }}>Call</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Vehicle Detail Pop-up */}
            <Modal visible={!!detailVehicle} transparent animationType="fade" onRequestClose={() => setDetailVehicle(null)}>
                <TouchableWithoutFeedback onPress={() => setDetailVehicle(null)}>
                    <View className="flex-1 bg-black/60 items-center justify-center px-6">
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <Animated.View entering={FadeIn.duration(300)} className="bg-white w-full rounded-[40px] overflow-hidden">
                        <View className="flex-row justify-between p-6 pb-0">
                            <TouchableOpacity onPress={() => setDetailVehicle(null)} className="p-2 bg-gray-100 rounded-full"><Ionicons name="close" size={20} color="#4b5563" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => { setDetailVehicle(null); router.push('/(resident)/vehicles' as any); }} className="p-2 bg-blue-50 rounded-full"><Ionicons name="settings-outline" size={20} color="#3b82f6" /></TouchableOpacity>
                        </View>
                        <View className="items-center px-6 pt-2 pb-8">
                            <View className="w-32 h-32 rounded-full bg-blue-50/50 items-center justify-center mb-6 border-8 border-white shadow-xl">
                                <MaterialCommunityIcons name={detailVehicle?.vehicleType.toUpperCase() === 'BIKE' ? 'motorbike' : 'car-sports'} size={64} color="#2563eb" />
                            </View>
                            <Text className="text-3xl font-bold text-gray-900 mb-1 text-center" style={{ fontFamily: 'Sora-Bold' }}>{detailVehicle?.vehicleNumber}</Text>
                            <Text className="text-lg font-bold text-gray-400 uppercase tracking-[2px] mb-6">
                                {detailVehicle?.make ? `${detailVehicle.make} ` : ''}{detailVehicle?.model} {detailVehicle?.color ? `• ${detailVehicle.color}` : ''}
                            </Text>
                            
                            <View className="w-full flex-row flex-wrap justify-between gap-y-4">
                                <View className="w-[48%] bg-gray-50 p-4 rounded-3xl items-center border border-gray-100">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</Text>
                                    <Text className={`text-[13px] font-extrabold ${detailVehicle ? (VEHICLE_STATUS[detailVehicle.status]?.text ?? 'text-gray-900') : ''}`}>{detailVehicle?.status}</Text>
                                </View>
                                <View className="w-[48%] bg-gray-50 p-4 rounded-3xl items-center border border-gray-100">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sticker</Text>
                                    <Text className="text-[13px] font-extrabold text-blue-600">{detailVehicle?.stickerNumber || 'Pending'}</Text>
                                </View>
                                <View className="w-[48%] bg-gray-50 p-4 rounded-3xl items-center border border-gray-100">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Parking Slot</Text>
                                    <Text className="text-[13px] font-extrabold text-orange-600">{detailVehicle?.parkingSlot || 'Not Assigned'}</Text>
                                </View>
                                <View className="w-[48%] bg-gray-50 p-4 rounded-3xl items-center border border-gray-100">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Type</Text>
                                    <Text className="text-[13px] font-extrabold text-gray-900">{detailVehicle?.vehicleType}</Text>
                                </View>
                {detailVehicle?.lastSeen && (
                                    <View className="w-full bg-gray-50 p-4 rounded-3xl items-center border border-gray-100">
                                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Seen At Gate</Text>
                                        <Text className="text-[13px] font-extrabold text-gray-900">{detailVehicle.lastSeen}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => { setDetailVehicle(null); router.push('/(resident)/vehicles' as any); }} className="bg-yellow-400 flex-row items-center justify-center py-5 gap-3">
                            <Ionicons name="qr-code" size={22} color="black" />
                            <Text className="text-xl font-bold text-black" style={{ fontFamily: 'Sora-Bold' }}>Manage Sticker</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>

            {/* Family Invite Modal - Redesigned to match screenshot */}
            <Modal visible={inviteVisible} transparent animationType="slide" onRequestClose={() => setInviteVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setInviteVisible(false)}>
                    <View className="flex-1 justify-end bg-black/40">
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View className="bg-white rounded-t-[40px] p-6 shadow-2xl" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                                <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Invite Family Member</Text>
                            <TouchableOpacity onPress={() => setInviteVisible(false)} className="p-2 bg-gray-100 rounded-full">
                                <Ionicons name="close" size={20} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Name *</Text>
                        <TextInput 
                            className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 mb-5 font-medium text-gray-900 text-[15px]" 
                            placeholder="e.g. Anjali Sharma" 
                            placeholderTextColor="#9ca3af"
                            value={inviteName} 
                            onChangeText={setInviteName} 
                        />

                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number (Optional)</Text>
                        <TextInput 
                            className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 mb-6 font-medium text-gray-900 text-[15px]" 
                            placeholder="10-digit mobile" 
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={invitePhone} 
                            onChangeText={setInvitePhone} 
                        />

                        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Relationship Role *</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {ROLES.map((role) => {
                                const isSelected = inviteRole === role;
                                const label = role.charAt(0) + role.slice(1).toLowerCase();
                                return (
                                    <TouchableOpacity 
                                        key={role} 
                                        onPress={() => setInviteRole(role)}
                                        className={`px-5 py-2.5 rounded-xl border ${isSelected ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-[13px] font-bold ${isSelected ? 'text-yellow-800' : 'text-gray-500'}`}>{label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity 
                            onPress={handleInvite} 
                            disabled={!inviteName.trim() || inviting}
                            className={`py-4 rounded-2xl items-center flex-row justify-center gap-3 ${!inviteName.trim() || inviting ? 'bg-gray-200' : 'bg-yellow-400'}`}
                            style={{ backgroundColor: !inviteName.trim() || inviting ? '#E5E7EB' : '#FACC15' }}
                        >
                            {inviting ? (
                                <ActivityIndicator size="small" color="#4b5563" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={18} color="black" />
                                    <Text className="font-bold text-base text-black">Send Invitation</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Add Vehicle Modal - Ported from add.tsx and matching screenshot */}
            <Modal visible={addVehicleVisible} transparent animationType="slide" onRequestClose={() => setAddVehicleVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setAddVehicleVisible(false)}>
                    <View className="flex-1 justify-end bg-black/40">
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View className="bg-white rounded-t-[40px] p-6 shadow-2xl" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                                <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Add Vehicle</Text>
                            <TouchableOpacity onPress={() => setAddVehicleVisible(false)} className="p-2 bg-gray-100 rounded-full">
                                <Ionicons name="close" size={20} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Vehicle Type *</Text>
                            <View className="flex-row gap-3 mb-8">
                                {[
                                    { type: 'Car' as const, icon: 'car', label: 'Four Wheeler' },
                                    { type: 'Bike' as const, icon: 'motorbike', label: 'Two Wheeler' },
                                    { type: 'Other' as const, icon: 'view-grid-plus', label: 'Other' },
                                ].map((cfg) => {
                                    const isSelected = newVehicleType === cfg.type;
                                    return (
                                        <TouchableOpacity
                                            key={cfg.type}
                                            onPress={() => setNewVehicleType(cfg.type)}
                                            className={`flex-1 rounded-2xl items-center py-4 border-2 ${isSelected ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-100 shadow-sm'}`}
                                        >
                                            <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${isSelected ? 'bg-yellow-400' : 'bg-gray-100'}`}>
                                                <MaterialCommunityIcons name={cfg.icon as any} size={22} color={isSelected ? 'black' : '#6b7280'} />
                                            </View>
                                            <Text className={`text-[12px] font-bold ${isSelected ? 'text-yellow-800' : 'text-gray-600'}`}>{cfg.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
                                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">License Plate Number *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 mb-5 font-medium text-gray-900 text-[15px]"
                                    placeholder="e.g. MH01AB1234"
                                    placeholderTextColor="#9ca3af"
                                    autoCapitalize="characters"
                                    value={newVehicleNumber}
                                    onChangeText={setNewVehicleNumber}
                                />

                                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Make / Model *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 mb-5 font-medium text-gray-900 text-[15px]"
                                    placeholder="e.g. Honda City"
                                    placeholderTextColor="#9ca3af"
                                    autoCapitalize="words"
                                    value={newVehicleModel}
                                    onChangeText={setNewVehicleModel}
                                />

                                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vehicle Color *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 font-medium text-gray-900 text-[15px]"
                                    placeholder="e.g. Matte Black"
                                    placeholderTextColor="#9ca3af"
                                    autoCapitalize="words"
                                    value={newVehicleColor}
                                    onChangeText={setNewVehicleColor}
                                />
                            </View>

                            <View className="flex-row items-start gap-4 bg-yellow-50 border border-yellow-100 rounded-3xl p-5 mb-8">
                                <View className="mt-1">
                                    <Ionicons name="information-circle" size={22} color="#ca8a04" />
                                </View>
                                <Text className="flex-1 text-[13px] text-yellow-900 leading-5">
                                    Your vehicle will be marked as <Text className="font-bold">Pending Approval</Text> until administration verifies it and assigns your official sticker.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleRegisterVehicle}
                                disabled={vehicleSubmitting || !newVehicleType || !newVehicleNumber.trim()}
                                className={`py-4 rounded-3xl items-center flex-row justify-center gap-3 ${vehicleSubmitting || !newVehicleType || !newVehicleNumber.trim() ? 'bg-gray-200' : 'bg-gray-300'}`}
                                style={{ backgroundColor: vehicleSubmitting || !newVehicleType || !newVehicleNumber.trim() ? '#E5E7EB' : '#D1D5DB' }}
                            >
                                {vehicleSubmitting ? (
                                    <ActivityIndicator size="small" color="#4b5563" />
                                ) : (
                                    <>
                                        <Ionicons name="shield-checkmark" size={20} color="#4b5563" />
                                        <Text className="text-base font-bold text-gray-600">Submit Registration</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}