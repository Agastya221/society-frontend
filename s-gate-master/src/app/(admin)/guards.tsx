import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Guard, GuardStatus, MOCK_GATES, MOCK_GUARDS } from '../../data';

const STATUS_OPTIONS: GuardStatus[] = ['ACTIVE', 'SUSPENDED', 'BANNED'];

export default function GuardsScreen() {
    const [guards, setGuards] = useState<Guard[]>(MOCK_GUARDS);
    const insets = useSafeAreaInsets();
    
    // Form & Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Fields
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [gateId, setGateId] = useState(MOCK_GATES[0]?.id || '');
    const [status, setStatus] = useState<GuardStatus>('ACTIVE');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setMobile('');
        setGateId(MOCK_GATES[0]?.id || '');
        setStatus('ACTIVE');
        setShiftStart('');
        setShiftEnd('');
        setAadhaarUrl(null);
        setEditingId(null);
    };

    const handleEdit = (guard: Guard) => {
        setName(guard.name);
        setMobile(guard.mobile);
        setGateId(guard.gateId);
        setStatus(guard.status);
        // Split shiftVal if possible, mock assumption: "Start - End"
        const [start, end] = guard.shiftVal.split(' - ');
        setShiftStart(start || '');
        setShiftEnd(end || '');
        setAadhaarUrl(guard.aadhaarUrl);
        setEditingId(guard.id);
        setModalVisible(true);
    };

    const handleMockFilePick = () => {
        // Mocking the File Picker behavior
        Alert.alert('File Picker', 'Select Aadhaar Card (PDF/JPG)', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Select mocked_aadhaar.jpg', 
                onPress: () => setAadhaarUrl('file:///mock/new_aadhaar.jpg') 
            }
        ]);
        // Strict compliance: Camera not allowed.
    };

    const handleSave = () => {
        if (!name || !mobile || !gateId) {
            Alert.alert('Error', 'Name, Mobile and Gate are required');
            return;
        }

        // Compliance Rule: Aadhaar Mandatory for NEW guards
        if (!editingId && !aadhaarUrl) {
            Alert.alert('Compliance Error', 'Aadhaar Card upload is MANDATORY for new guards.');
            return;
        }

        const shiftVal = (shiftStart && shiftEnd) ? `${shiftStart} - ${shiftEnd}` : 'Not Assigned';

        if (editingId) {
            setGuards(prev => prev.map(g => g.id === editingId ? {
                ...g,
                name,
                mobile,
                gateId,
                status,
                shiftVal,
                aadhaarUrl
            } : g));
        } else {
            const newGuard: Guard = {
                id: Date.now().toString(),
                name,
                mobile,
                gateId,
                status, // Default ACTIVE
                shiftVal,
                aadhaarUrl,
                shifts: []
            };
            setGuards([...guards, newGuard]);
        }
        setModalVisible(false);
        resetForm();
    };

    const toggleStatus = (guard: Guard) => {
        // Quick toggle for ACTIVE <-> SUSPENDED
        // BANNED requires manual edit in modal usually, but let's allow quick disable
        const newStatus = guard.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, status: newStatus } : g));
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
            <FlatList
                data={guards}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                ListHeaderComponent={
                    <PrimaryButton
                        title="+ Add New Guard"
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        className="mb-6"
                    />
                }
                renderItem={({ item }) => {
                    const gateName = MOCK_GATES.find(g => g.id === item.gateId)?.name || 'Unknown Gate';
                    return (
                        <Card className="mb-3">
                            <View className="flex-row justify-between items-start mb-2">
                                <View>
                                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">{item.name}</Text>
                                    <Text className="text-zinc-500">{item.mobile}</Text>
                                </View>
                                {/* Status Badge Re-use or Custom */}
                                <View className={`px-2 py-1 rounded ${
                                    item.status === 'ACTIVE' ? 'bg-green-100' : 
                                    item.status === 'BANNED' ? 'bg-red-100' : 'bg-orange-100'
                                }`}>
                                    <Text className={`text-xs font-bold ${
                                        item.status === 'ACTIVE' ? 'text-green-700' : 
                                        item.status === 'BANNED' ? 'text-red-700' : 'text-orange-700'
                                    }`}>{item.status}</Text>
                                </View>
                            </View>

                            <View className="flex-row gap-4 mb-4 mt-2">
                                <View className="flex-row items-center">
                                    <Feather name="map-pin" size={14} color="#71717a" />
                                    <Text className="ml-1 text-zinc-600 dark:text-zinc-400">{gateName}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Feather name="clock" size={14} color="#71717a" />
                                    <Text className="ml-1 text-zinc-600 dark:text-zinc-400">{item.shiftVal}</Text>
                                </View>
                            </View>

                            {/* Compliance Check UI */}
                            {item.aadhaarUrl ? (
                                <View className="flex-row items-center mb-3">
                                    <Feather name="check-circle" size={14} color="#15803d" />
                                    <Text className="ml-1 text-xs text-green-600">Aadhaar Verified</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center mb-3">
                                    <Feather name="alert-circle" size={14} color="#ef4444" />
                                    <Text className="ml-1 text-xs text-red-600">Aadhaar Missing</Text>
                                </View>
                            )}

                            <View className="flex-row gap-2">
                                <PrimaryButton
                                    title={item.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                    onPress={() => toggleStatus(item)}
                                    variant={item.status === 'ACTIVE' ? 'secondary' : 'primary'}
                                    className="flex-1 py-2"
                                />
                                <PrimaryButton
                                    title="Edit Details"
                                    variant="outline"
                                    onPress={() => handleEdit(item)}
                                    className="px-4 py-2"
                                />
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
                            {editingId ? 'Edit Guard' : 'New Guard'}
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
                            placeholder="e.g. Suresh Kumar"
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

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Assigned Gate *</Text>
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {MOCK_GATES.map(g => (
                                <TouchableOpacity
                                    key={g.id}
                                    onPress={() => setGateId(g.id)}
                                    className={`px-3 py-2 rounded-lg border ${gateId === g.id ? 'bg-zinc-900 border-zinc-900 dark:bg-white' : 'border-zinc-300'}`}
                                >
                                    <Text className={gateId === g.id ? 'text-white dark:text-black font-bold' : 'text-zinc-600'}>
                                        {g.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Aadhaar Card (Mandatory) *</Text>
                        <TouchableOpacity 
                            onPress={handleMockFilePick}
                            className={`p-4 rounded-xl border-dashed border-2 mb-6 items-center flex-row justify-center gap-2 ${aadhaarUrl ? 'border-green-500 bg-green-50' : 'border-zinc-300 bg-zinc-50'}`}
                        >
                            <Feather name={aadhaarUrl ? "check" : "upload"} size={20} color={aadhaarUrl ? "#15803d" : "#71717a"} />
                            <Text className={aadhaarUrl ? "text-green-700 font-bold" : "text-zinc-500"}>
                                {aadhaarUrl ? "Aadhaar Uploaded" : "Upload Aadhaar (File Picker)"}
                            </Text>
                        </TouchableOpacity>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Shift Timing</Text>
                        <View className="flex-row gap-4 mb-4">
                            <TextInput
                                className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                                placeholder="Start (08:00 AM)"
                                value={shiftStart}
                                onChangeText={setShiftStart}
                                placeholderTextColor="#a1a1aa"
                            />
                            <TextInput
                                className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                                placeholder="End (04:00 PM)"
                                value={shiftEnd}
                                onChangeText={setShiftEnd}
                                placeholderTextColor="#a1a1aa"
                            />
                        </View>

                        {editingId && (
                            <>
                                <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Service Status</Text>
                                <View className="flex-row gap-2 mb-6">
                                    {STATUS_OPTIONS.map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => setStatus(s)}
                                            className={`px-3 py-2 rounded-lg border ${status === s ? 'bg-zinc-900 border-zinc-900 dark:bg-white' : 'border-zinc-300'}`}
                                        >
                                            <Text className={status === s ? 'text-white dark:text-black font-bold' : 'text-zinc-600'}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <PrimaryButton 
                            title={editingId ? "Update Guard" : "Onboard Guard"} 
                            onPress={handleSave} 
                        />
                         <View className="h-10" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
