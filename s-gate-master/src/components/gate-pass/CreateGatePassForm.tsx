import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MOCK_FLATS } from '../../data/flats';
import { createGatePass, CreateGatePassPayload, GatePassResponse, GatePassType } from '../../services/gatePass';

type GatePassTypeOption = {
    label: string;
    value: GatePassType;
    icon: string;
};

const GATE_PASS_TYPES: GatePassTypeOption[] = [
    { label: 'Material', value: 'MATERIAL', icon: 'cube-outline' },
    { label: 'Move Out', value: 'MOVE_OUT', icon: 'log-out-outline' },
    { label: 'Move In', value: 'MOVE_IN', icon: 'log-in-outline' },
    { label: 'Maintenance', value: 'MAINTENANCE', icon: 'construct-outline' },
];

interface CreateGatePassFormProps {
    role: 'RESIDENT' | 'ADMIN';
    onSuccess: (data: GatePassResponse) => void;
}

export function CreateGatePassForm({ role, onSuccess }: CreateGatePassFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [type, setType] = useState<GatePassType>('MATERIAL');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [validFrom, setValidFrom] = useState(new Date());
    const [validUntil, setValidUntil] = useState(new Date(new Date().setHours(new Date().getHours() + 4))); // Default +4 hours
    const [companyName, setCompanyName] = useState('');
    const [selectedFlatId, setSelectedFlatId] = useState(MOCK_FLATS[0]?.id || '');

    // Picker State
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    const handleSubmit = async () => {
        // Validation
        if (!title.trim() || title.length < 3) {
            Alert.alert('Error', 'Title is required (min 3 characters)');
            return;
        }

        if (!description.trim() || description.length < 3) {
            Alert.alert('Error', 'Description is required (min 3 characters)');
            return;
        }

        if (validUntil <= validFrom) {
            Alert.alert('Error', 'Valid Until must be after Valid From');
            return;
        }

        if (role === 'ADMIN' && !selectedFlatId) {
            Alert.alert('Error', 'Please select a flat');
            return;
        }

        setIsLoading(true);

        try {
            const payload: CreateGatePassPayload = {
                type,
                title: title.trim(),
                description: description.trim(),
                validFrom: validFrom.toISOString(),
                validUntil: validUntil.toISOString(),
                companyName: companyName.trim() || null,
            };

            // Add flatId only if role is ADMIN
            if (role === 'ADMIN') {
                payload.flatId = selectedFlatId;
            }

            const result = await createGatePass(payload);
            
            Alert.alert('Success', 'Gate Pass Created Successfully', [
                { text: 'OK', onPress: () => onSuccess(result) }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create gate pass');
        } finally {
            setIsLoading(false);
        }
    };

    const onFromChange = (event: any, selectedDate?: Date) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setValidFrom(selectedDate);
            // Default Valid To to +4 hours if it becomes invalid
            if (validUntil <= selectedDate) {
                setValidUntil(new Date(selectedDate.getTime() + 4 * 60 * 60 * 1000));
            }
        }
    };

    const onToChange = (event: any, selectedDate?: Date) => {
        setShowToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setValidUntil(selectedDate);
        }
    };

    const selectedFlat = MOCK_FLATS.find(f => f.id === selectedFlatId);

    return (
        <View className="flex-1 bg-white dark:bg-zinc-900">
            <ScrollView className="flex-1 p-5">
                {/* Flat Selector - Admin Only */}
                {role === 'ADMIN' && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                            Select Flat <Text className="text-red-500">*</Text>
                        </Text>
                        <View className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
                            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                                {selectedFlat ? `${selectedFlat.block}-${selectedFlat.number}` : 'Select Flat'}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                {MOCK_FLATS.map((flat) => (
                                    <TouchableOpacity
                                        key={flat.id}
                                        onPress={() => setSelectedFlatId(flat.id)}
                                        className={`px-4 py-3 rounded-lg border-2 ${
                                            selectedFlatId === flat.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                        }`}
                                    >
                                        <Text className={`font-bold text-sm ${
                                            selectedFlatId === flat.id ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {flat.block}-{flat.number}
                                        </Text>
                                        <Text className={`text-xs mt-1 ${
                                            selectedFlatId === flat.id ? 'text-blue-500' : 'text-gray-500'
                                        }`}>
                                            {flat.ownerName}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}

                {/* Type Selection */}
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Pass Type</Text>
                <View className="flex-row gap-3 mb-6">
                    {GATE_PASS_TYPES.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => setType(option.value)}
                            className={`flex-1 items-center justify-center p-3 rounded-xl border-2 ${
                                type === option.value 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                            }`}
                        >
                            <Ionicons 
                                name={option.icon as any} 
                                size={24} 
                                color={type === option.value ? '#3b82f6' : '#9ca3af'} 
                            />
                            <Text className={`mt-2 text-xs font-bold ${
                                type === option.value ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Title <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-gray-900 dark:text-gray-100"
                        placeholder="e.g. Furniture Delivery, Construction Material, etc."
                        placeholderTextColor="#9ca3af"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Description */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Description <Text className="text-red-500">*</Text></Text>
                    <TextInput
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-gray-900 dark:text-gray-100 min-h-[100px]"
                        placeholder="What items are being moved? e.g. Furniture, construction material..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Dates Row */}
                <View className="flex-row gap-4 mb-5">
                    <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Valid From</Text>
                        <TouchableOpacity
                            onPress={() => setShowFromPicker(true)}
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 flex-row items-center gap-2"
                        >
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                            <View>
                                <Text className="text-xs text-gray-400">Date & Time</Text>
                                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {validFrom.toLocaleDateString()} {validFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Valid Until</Text>
                        <TouchableOpacity
                            onPress={() => setShowToPicker(true)}
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 flex-row items-center gap-2"
                        >
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                            <View>
                                <Text className="text-xs text-gray-400">Date & Time</Text>
                                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {validUntil.toLocaleDateString()} {validUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Pickers */}
                {showFromPicker && (
                    <DateTimePicker
                        value={validFrom}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onFromChange}
                        minimumDate={new Date()} // Can't be in past
                    />
                )}
                {showToPicker && (
                    <DateTimePicker
                        value={validUntil}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onToChange}
                        minimumDate={validFrom} // Can't be before Valid From
                    />
                )}

                {/* Company / Contractor Name */}
                <View className="mb-8">
                    <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Company / Contractor Name (Optional)</Text>
                    <TextInput
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-gray-900 dark:text-gray-100"
                        placeholder="e.g. Urban Company, HDFC, Movers & Packers..."
                        placeholderTextColor="#9ca3af"
                        value={companyName}
                        onChangeText={setCompanyName}
                    />
                </View>
            </ScrollView>

            {/* Footer / Submit Button */}
            <View className="p-5 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 safe-area-bottom">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                        isLoading ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                            <Text className="text-white font-bold text-lg">Create Gate Pass</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
