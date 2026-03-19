import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface Resident {
    id: string;
    name: string;
    mobile: string;
    flatId: string;
    type: 'OWNER' | 'RENTER' | 'FAMILY';
    agreementUrl?: string | null;
}

interface FlatOption {
    id: string;
    number: string;
    block: string;
}

const RESIDENT_TYPES: Resident['type'][] = ['OWNER', 'RENTER', 'FAMILY'];

export default function ResidentsScreen() {
    const user = useAuthStore(s => s.user);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [flatOptions, setFlatOptions] = useState<FlatOption[]>([]);

    // Fetch approved residents
    useEffect(() => {
        api.get('/resident/onboarding/admin/pending', {
            params: { status: 'APPROVED', page: 1, limit: 100 },
        })
            .then(res => {
                const raw = res.data?.data ?? [];
                const mapped: Resident[] = raw.map((r: any) => ({
                    id: r.id,
                    name: r.user?.name ?? '',
                    mobile: r.user?.phone ?? '',
                    flatId: r.flatId,
                    type: r.residentType === 'TENANT' ? 'RENTER' : 'OWNER',
                    agreementUrl: null,
                }));
                setResidents(mapped);
            })
            .catch(console.error);
    }, []);

    // Fetch flats for the modal flat selector
    useEffect(() => {
        const societyId = user?.societyId;
        if (!societyId) return;

        const loadFlats = async () => {
            try {
                const blocksRes = await api.get(
                    `/resident/onboarding/societies/${societyId}/blocks`
                );
                const blocks: { id: string; name: string }[] =
                    blocksRes.data?.data ?? [];

                const all: FlatOption[] = [];
                await Promise.all(
                    blocks.map(async block => {
                        try {
                            const flatsRes = await api.get(
                                `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`
                            );
                            const blockFlats = (flatsRes.data?.data ?? []).map(
                                (f: { id: string; number: string }) => ({
                                    id: f.id,
                                    number: f.number,
                                    block: block.name,
                                })
                            );
                            all.push(...blockFlats);
                        } catch {
                            // skip
                        }
                    })
                );

                all.sort((a, b) =>
                    a.block.localeCompare(b.block) ||
                    a.number.localeCompare(b.number)
                );
                setFlatOptions(all);
                if (all.length > 0) setFlatId(all[0].id);
            } catch (err) {
                console.error('Failed to load flats:', err);
            }
        };

        loadFlats();
    }, [user?.societyId]);
    const insets = useSafeAreaInsets();
    
    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form Fields
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [flatId, setFlatId] = useState('');
    const [type, setType] = useState<Resident['type']>('OWNER');
    const [agreementUrl, setAgreementUrl] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setMobile('');
        setFlatId(flatOptions[0]?.id || '');
        setType('OWNER');
        setAgreementUrl(null);
        setEditingId(null);
    };

    const handleEdit = (resident: Resident) => {
        setName(resident.name);
        setMobile(resident.mobile);
        setFlatId(resident.flatId);
        setType(resident.type);
        setAgreementUrl(resident.agreementUrl || null);
        setEditingId(resident.id);
        setModalVisible(true);
    };

    const handleMockFilePick = () => {
        Alert.alert('File Picker', 'Select Tenant Agreement (PDF)', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Select agreement.pdf', 
                onPress: () => setAgreementUrl('file:///mock/agreement.pdf') 
            }
        ]);
    };

    const handleSave = () => {
        if (!name || !mobile || !flatId) {
            Alert.alert('Error', 'Name, Mobile and Flat are required');
            return;
        }

        // Compliance: Renter must have agreement
        if (type === 'RENTER' && !agreementUrl) {
            Alert.alert('Compliance Error', 'Tenant Agreement is MANDATORY for Renters.');
            return;
        }

        if (editingId) {
            setResidents(prev => prev.map(r => r.id === editingId ? {
                ...r, name, mobile, flatId, type, agreementUrl
            } : r));
        } else {
            const newResident: Resident = {
                id: Date.now().toString(),
                name,
                mobile,
                flatId,
                type,
                agreementUrl
            };
            setResidents([...residents, newResident]);
        }
        setModalVisible(false);
        resetForm();
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
            <FlatList
                data={residents}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                ListHeaderComponent={
                    <PrimaryButton
                        title="+ Register Resident"
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        className="mb-6"
                    />
                }
                renderItem={({ item }) => {
                    const flat = flatOptions.find(f => f.id === item.flatId);
                    return (
                        <Card className="mb-3">
                            <View className="flex-row justify-between items-start mb-2">
                                <View>
                                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">{item.name}</Text>
                                    <Text className="text-zinc-500">{item.mobile}</Text>
                                </View>
                                <View className={`px-2 py-1 rounded ${
                                    item.type === 'OWNER' ? 'bg-purple-100' : 
                                    item.type === 'RENTER' ? 'bg-blue-100' : 'bg-green-100'
                                }`}>
                                    <Text className={`text-xs font-bold ${
                                        item.type === 'OWNER' ? 'text-purple-700' : 
                                        item.type === 'RENTER' ? 'text-blue-700' : 'text-green-700'
                                    }`}>{item.type}</Text>
                                </View>
                            </View>

                            <View className="flex-row gap-4 mb-3 mt-1">
                                <View className="flex-row items-center">
                                    <Feather name="home" size={14} color="#71717a" />
                                    <Text className="ml-1 text-zinc-600 dark:text-zinc-400">
                                        Flat {flat ? `${flat.number} (${flat.block})` : 'Unknown'}
                                    </Text>
                                </View>
                                {item.type === 'RENTER' && (
                                    <View className="flex-row items-center">
                                        <Feather name={item.agreementUrl ? "file-text" : "alert-triangle"} size={14} color={item.agreementUrl ? "#15803d" : "#ef4444"} />
                                        <Text className={`ml-1 text-xs ${item.agreementUrl ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.agreementUrl ? 'Agreement Verified' : 'No Agreement'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row gap-2 mt-2">
                                <TouchableOpacity 
                                    onPress={() => handleEdit(item)}
                                    className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg"
                                >
                                    <Feather name="edit-2" size={14} color="#71717a" />
                                    <Text className="ml-2 font-medium text-zinc-700 dark:text-zinc-300">Edit Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                }}
            />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View 
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {editingId ? 'Edit Resident' : 'Register Resident'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Full Name *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. John Doe"
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Mobile Number *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            value={mobile}
                            onChangeText={setMobile}
                            keyboardType="phone-pad"
                            placeholder="e.g. 9876543210"
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Assigned Flat *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            <View className="flex-row gap-2">
                                {flatOptions.map(f => (
                                    <TouchableOpacity
                                        key={f.id}
                                        onPress={() => setFlatId(f.id)}
                                        className={`px-3 py-2 rounded-lg border ${flatId === f.id ? 'bg-zinc-900 border-zinc-900 dark:bg-white' : 'border-zinc-300'}`}
                                    >
                                        <Text className={flatId === f.id ? 'text-white dark:text-black font-bold' : 'text-zinc-600'}>
                                            {f.block}-{f.number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Resident Type *</Text>
                        <View className="flex-row gap-2 mb-6">
                            {RESIDENT_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg border ${type === t ? 'bg-zinc-900 border-zinc-900 dark:bg-white' : 'border-zinc-300'}`}
                                >
                                    <Text className={type === t ? 'text-white dark:text-black font-bold' : 'text-zinc-600'}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {type === 'RENTER' && (
                            <View>
                                <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Tenant Agreement (Mandatory) *</Text>
                                <TouchableOpacity 
                                    onPress={handleMockFilePick}
                                    className={`p-4 rounded-xl border-dashed border-2 mb-6 items-center flex-row justify-center gap-2 ${agreementUrl ? 'border-green-500 bg-green-50' : 'border-zinc-300 bg-zinc-50'}`}
                                >
                                    <Feather name={agreementUrl ? "check" : "upload"} size={20} color={agreementUrl ? "#15803d" : "#71717a"} />
                                    <Text className={agreementUrl ? "text-green-700 font-bold" : "text-zinc-500"}>
                                        {agreementUrl ? "Agreement Uploaded" : "Upload Agreement (File Picker)"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <PrimaryButton 
                            title={editingId ? "Update Resident" : "Register Resident"} 
                            onPress={handleSave} 
                        />
                         <View className="h-10" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
