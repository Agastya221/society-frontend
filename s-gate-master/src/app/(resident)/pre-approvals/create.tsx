import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import api from '../../../services/api';

const VISITOR_TYPES = [
    { label: 'Guest', value: 'GUEST' },
    { label: 'Family', value: 'FAMILY_MEMBER' },
    { label: 'Friend', value: 'FRIEND' },
    { label: 'Delivery', value: 'DELIVERY_PERSON' },
    { label: 'Cab', value: 'CAB_DRIVER' },
    { label: 'Service', value: 'SERVICE_PROVIDER' },
];

export default function CreatePreApprovalScreen() {
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState('GUEST');
    const [vehicleNo, setVehicleNo] = useState('');

    // Date/Time State
    const [validFrom, setValidFrom] = useState(new Date());
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 2); // Default to 2 hours from now
        return d;
    });

    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [showPickerFor, setShowPickerFor] = useState<'from' | 'until' | null>(null);

    // API State
    const [submitting, setSubmitting] = useState(false);
    const [successResponse, setSuccessResponse] = useState<any>(null); // To store QR returned

    // Date Picker Handlers
    const onChangeDate = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPickerFor(null);
        }
        if (selectedDate) {
            if (showPickerFor === 'from') setValidFrom(selectedDate);
            if (showPickerFor === 'until') setValidUntil(selectedDate);
        }
    };

    const triggerPicker = (field: 'from' | 'until', mode: 'date' | 'time') => {
        setShowPickerFor(field);
        setPickerMode(mode);
    };

    // Format helpers
    const formatDateStr = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTimeStr = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please enter a visitor name.');
            return;
        }

        if (validUntil <= validFrom) {
            Alert.alert('Invalid Time', 'Valid Until time must be after Valid From time.');
            return;
        }

        setSubmitting(true);

        try {
            const payload: any = {
                visitorName: name.trim(),
                visitorType: type,
                validFrom: validFrom.toISOString(),
                validUntil: validUntil.toISOString(),
            };

            if (phone.trim()) {
                let p = phone.replace(/\D/g, '');
                if (p.length === 10) payload.visitorPhone = `+91${p}`;
                else if (p.length > 10) payload.visitorPhone = `+${p}`;
                else payload.visitorPhone = `+91${p}`;
            }

            if (vehicleNo.trim()) payload.vehicleNumber = vehicleNo.trim();

            const res = await api.post('/gate/preapprovals', payload);
            setSuccessResponse(res.data?.data);

        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create pre-approval');
        } finally {
            setSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Hi ${name.split(' ')[0]}, here is your Gate Pass for entry!\nVisitor Type: ${type.replace('_', ' ')}\nValid until: ${validUntil.toLocaleString()}\n\nPlease show this QR code at the security gate:\n${successResponse.qrCodeUrl}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleCloseFinal = () => {
        setSuccessResponse(null);
        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="close" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Invite Visitor</Text>
            </View>

            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
                <Card className="p-5 gap-6 mb-8">
                    
                    {/* Visitor Name */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Visitor Name *</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3.5 text-base font-semibold text-gray-900 dark:text-white"
                            placeholder="e.g. Rahul Sharma"
                            placeholderTextColor="#9ca3af"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Visitor Phone */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Visitor Phone (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3.5 text-base font-semibold text-gray-900 dark:text-white"
                            placeholder="10-digit mobile number"
                            placeholderTextColor="#9ca3af"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Vehicle Number */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Vehicle Number (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3.5 text-base font-semibold text-gray-900 dark:text-white uppercase"
                            placeholder="e.g. MH 01 AB 1234"
                            placeholderTextColor="#9ca3af"
                            value={vehicleNo}
                            onChangeText={setVehicleNo}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* Visitor Type Selector */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Visitor Type *</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {VISITOR_TYPES.map((t) => {
                                const isSelected = type === t.value;
                                return (
                                    <TouchableOpacity
                                        key={t.value}
                                        onPress={() => setType(t.value)}
                                        className={`px-4 py-2 rounded-xl border-2 ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-500' 
                                                : 'bg-white border-gray-200 dark:bg-zinc-800 dark:border-zinc-700'
                                        }`}
                                    >
                                        <Text className={`text-sm font-bold ${
                                            isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                    
                    {/* Time Window */}
                    <View className="mt-2 border-t border-gray-100 dark:border-zinc-800 pt-5">
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Valid Time Window *</Text>
                        
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1 ml-1 font-semibold uppercase tracking-wider">Starts From</Text>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity 
                                        onPress={() => triggerPicker('from', 'date')}
                                        className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 items-center justify-center flex-row gap-2"
                                    >
                                        <Ionicons name="calendar" size={16} color="#4f46e5" />
                                        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatDateStr(validFrom)}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => triggerPicker('from', 'time')}
                                        className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 items-center justify-center flex-row gap-2"
                                    >
                                        <Ionicons name="time" size={16} color="#4f46e5" />
                                        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatTimeStr(validFrom)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View className="flex-row justify-center relative -my-3 z-10">
                            <View className="bg-white border border-gray-200 h-8 w-8 rounded-full items-center justify-center">
                                <Ionicons name="arrow-down" size={16} color="#9ca3af" />
                            </View>
                        </View>

                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1 ml-1 font-semibold uppercase tracking-wider">Ends At</Text>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity 
                                        onPress={() => triggerPicker('until', 'date')}
                                        className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 items-center justify-center flex-row gap-2"
                                    >
                                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatDateStr(validUntil)}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => triggerPicker('until', 'time')}
                                        className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 items-center justify-center flex-row gap-2"
                                    >
                                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                                        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatTimeStr(validUntil)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Native Date Time Pickers Layer */}
                    {showPickerFor && (
                        <DateTimePicker
                            value={showPickerFor === 'from' ? validFrom : validUntil}
                            mode={pickerMode}
                            is24Hour={false}
                            display="default"
                            onChange={onChangeDate}
                            minimumDate={showPickerFor === 'until' ? validFrom : new Date()}
                        />
                    )}

                </Card>

                <PrimaryButton 
                    title={submitting ? "Processing..." : "Generate Entry Code"} 
                    onPress={handleSubmit}
                    disabled={!name.trim() || submitting}
                    className="mb-10 py-4 shadow-lg shadow-indigo-200 dark:shadow-none"
                    leftIcon={submitting ? undefined : <Ionicons name="qr-code-outline" size={20} color="white" />}
                />
            </ScrollView>

            {/* Success QR Modal */}
            <Modal
                visible={!!successResponse}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCloseFinal}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-6">
                    <View className="bg-white rounded-3xl p-6 items-center border border-gray-100 shadow-xl w-full max-w-[340px]">
                        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name="checkmark-done" size={32} color="#16a34a" />
                        </View>
                        <Text className="text-2xl font-black text-gray-900 mb-1 text-center">Invited Successfully!</Text>
                        <Text className="text-sm font-medium text-gray-500 mb-6 text-center">
                            Gate pass created for {successResponse?.visitorName}
                        </Text>
                        
                        <View className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 shadow-sm mb-6 pb-2 w-[240px] items-center">
                            <Text className="text-xs font-bold tracking-widest text-indigo-600 mb-3">DIGITAL GATE PASS</Text>
                            {successResponse?.qrCodeUrl && (
                                <Image 
                                    source={{ uri: successResponse.qrCodeUrl }} 
                                    style={{ width: 180, height: 180, marginBottom: 8 }}
                                    resizeMode="contain"
                                />
                            )}
                        </View>

                        <View className="flex-row gap-3 w-full mt-2">
                            <TouchableOpacity
                                onPress={handleShare}
                                className="flex-1 py-3.5 bg-indigo-600 rounded-xl flex-row justify-center items-center"
                            >
                                <Ionicons name="share-outline" size={18} color="white" className="mr-2" />
                                <Text className="text-white font-bold text-sm">Share QR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCloseFinal}
                                className="flex-1 py-3.5 bg-gray-100 rounded-xl flex-row justify-center items-center border border-gray-200"
                            >
                                <Text className="text-gray-700 font-bold text-sm">Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
