import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    role: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
    isActive: boolean;
}

const ROLES = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];

export default function FamilyScreen() {
    const router = useRouter();
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
        <View className="mb-3 p-4 flex-row items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm" style={{ shadowOpacity: 0.02, shadowRadius: 8 }}>
             <View className="h-12 w-12 rounded-full bg-indigo-100  items-center justify-center">
                 <Text className="text-xl font-bold text-indigo-600 ">{item.name[0]}</Text>
            </View>
            <View className="flex-1">
                <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-bold text-gray-900 ">{item.name}</Text>
                    {item.isActive && (
                        <View className="bg-emerald-100  px-1.5 py-0.5 rounded flex-row items-center gap-1 border border-emerald-200">
                            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <Text className="text-[10px] font-bold text-emerald-700  uppercase">Active</Text>
                        </View>
                    )}
                </View>
                <Text className="text-gray-500  text-xs font-semibold capitalize mt-0.5">{item.role ? item.role.toLowerCase() : 'Family Member'}</Text>
                {item.phone ? (
                    <Text className="text-gray-400 text-xs mt-1 font-medium tracking-wider">{item.phone}</Text>
                )  : null}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 ">
            <View style={{ paddingTop: insets.top + 12, paddingBottom: 16 }} className="px-5 flex-row items-center justify-between bg-white  border-b border-gray-100 ">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 ">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 " />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 ">My Family</Text>
                </View>
                <TouchableOpacity onPress={() => setInviteModalVisible(true)} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200  bg-indigo-600 active:bg-indigo-700">
                    <Ionicons name="person-add" size={18} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={family}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center py-20 opacity-70">
                            <Ionicons name="people-circle-outline" size={64} className="text-gray-300 mb-4" />
                            <Text className="text-gray-600 font-medium">No family members added yet. Invite someone to get started.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        family.length > 0 ? (
                            <View className="mt-4 p-4 bg-indigo-50  rounded-xl border border-indigo-100 ">
                                <View className="flex-row gap-3 mb-2">
                                    <Ionicons name="information-circle" size={24} className="text-indigo-600 " />
                                    <Text className="font-bold text-indigo-900  flex-1">Did you know?</Text>
                                </View>
                                <Text className="text-indigo-800  text-sm leading-5">
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
                animationType="slide"
                onRequestClose={() => setInviteModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-white rounded-t-3xl p-6 shadow-xl pb-10">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Invite Family Member</Text>
                            <TouchableOpacity onPress={() => setInviteModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
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
                        />

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Phone Number (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-900 text-base tracking-widest"
                            value={invitePhone}
                            onChangeText={setInvitePhone}
                            placeholder="10-digit mobile"
                            keyboardType="phone-pad"
                        />

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Relationship Role *</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {ROLES.map((r) => {
                                const isSelected = inviteRole === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setInviteRole(r)}
                                        className={`px-4 py-2 rounded-xl border-2 ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-600' 
                                                : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <Text className={`text-sm font-bold ${
                                            isSelected ? 'text-indigo-700' : 'text-gray-600'
                                        }`}>
                                            {r.charAt(0) + r.slice(1).toLowerCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            onPress={handleInvite}
                            disabled={inviting || !inviteName.trim()}
                            className={`py-4 rounded-xl items-center shadow-sm flex-row justify-center gap-2 ${inviting || !inviteName.trim() ? 'bg-indigo-300' : 'bg-indigo-600'}`}
                        >
                            {inviting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="paper-plane" size={18} color="white" />}
                            <Text className="font-bold text-white text-base">
                                {inviting ? 'Sending Invite...' : 'Send Invitation'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
