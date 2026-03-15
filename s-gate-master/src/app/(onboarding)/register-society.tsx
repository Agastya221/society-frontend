import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

interface FormData {
    societyName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    totalFlats: string;
    monthlyFee: string;
}

interface FormErrors {
    [key: string]: string;
}

export default function RegisterSocietyScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    const [form, setForm] = useState<FormData>({
        societyName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactName: user?.name ?? '',
        contactPhone: user?.phone ?? '',
        contactEmail: user?.email ?? '',
        totalFlats: '',
        monthlyFee: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.societyName.trim()) e.societyName = 'Society name is required';
        if (!form.address.trim()) e.address = 'Address is required';
        if (!form.city.trim()) e.city = 'City is required';
        if (!form.state.trim()) e.state = 'State is required';
        if (!form.pincode.trim()) e.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Must be exactly 6 digits';
        if (!form.contactName.trim()) e.contactName = 'Contact name is required';
        if (!form.contactPhone.trim()) e.contactPhone = 'Contact phone is required';
        if (!form.totalFlats.trim()) e.totalFlats = 'Total flats is required';
        else if (parseInt(form.totalFlats) <= 0) e.totalFlats = 'Must be a positive number';
        if (!form.monthlyFee.trim()) e.monthlyFee = 'Monthly fee is required';
        else if (parseFloat(form.monthlyFee) <= 0) e.monthlyFee = 'Must be a positive number';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await api.post('/api/v1/society-registration/request', {
                societyName: form.societyName.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                pincode: form.pincode.trim(),
                contactName: form.contactName.trim(),
                contactPhone: form.contactPhone.trim(),
                contactEmail: form.contactEmail.trim() || undefined,
                totalFlats: parseInt(form.totalFlats),
                monthlyFee: parseFloat(form.monthlyFee),
            });
            router.replace('/(onboarding)/registration-status');
        } catch (err: any) {
            if (err?.response?.status === 409) {
                Alert.alert(
                    'Already Submitted',
                    'You already have an active society registration request.',
                    [
                        { text: 'View Status', onPress: () => router.replace('/(onboarding)/registration-status') },
                        { text: 'OK' },
                    ]
                );
            } else {
                const msg = err?.response?.data?.message || 'Failed to submit registration. Please try again.';
                Alert.alert('Error', msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (
        label: string,
        field: keyof FormData,
        opts?: {
            placeholder?: string;
            keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
            multiline?: boolean;
            prefix?: string;
            required?: boolean;
        }
    ) => {
        const { placeholder, keyboardType = 'default', multiline = false, prefix, required = true } = opts ?? {};
        return (
            <View className="mb-4" key={field}>
                <View className="flex-row items-center gap-1 mb-1.5">
                    <Text className="text-gray-700 font-semibold text-sm">{label}</Text>
                    {required && <Text className="text-red-500 text-sm">*</Text>}
                </View>
                <View className={`bg-gray-50 border rounded-xl px-4 ${multiline ? 'py-3' : 'py-1'} flex-row items-center ${
                    errors[field] ? 'border-red-300' : 'border-gray-200'
                }`}>
                    {prefix && <Text className="text-gray-500 font-medium mr-1">{prefix}</Text>}
                    <TextInput
                        className="flex-1 text-gray-900 text-base"
                        placeholder={placeholder || label}
                        placeholderTextColor="#9ca3af"
                        value={form[field]}
                        onChangeText={(v) => updateField(field, v)}
                        keyboardType={keyboardType}
                        multiline={multiline}
                        numberOfLines={multiline ? 3 : 1}
                        textAlignVertical={multiline ? 'top' : 'center'}
                        style={multiline ? { minHeight: 80 } : undefined}
                    />
                </View>
                {errors[field] && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">{errors[field]}</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-xl">Register Society</Text>
                        <Text className="text-gray-400 text-xs mt-0.5">Set up a new society on S-Gate</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Society Details Section */}
                    <View className="mb-2">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Feather name="home" size={18} color="#4f46e5" />
                            <Text className="text-indigo-600 font-bold text-sm">SOCIETY DETAILS</Text>
                        </View>
                        {renderField('Society Name', 'societyName', { placeholder: 'e.g. Green Valley Apartments' })}
                        {renderField('Address', 'address', { placeholder: 'Full address', multiline: true })}
                        {renderField('City', 'city', { placeholder: 'e.g. Mumbai' })}
                        {renderField('State', 'state', { placeholder: 'e.g. Maharashtra' })}
                        {renderField('Pincode', 'pincode', { placeholder: '6-digit pincode', keyboardType: 'number-pad' })}
                    </View>

                    {/* Contact Section */}
                    <View className="mb-2">
                        <View className="flex-row items-center gap-2 mb-4 mt-2">
                            <Feather name="user" size={18} color="#4f46e5" />
                            <Text className="text-indigo-600 font-bold text-sm">CONTACT PERSON</Text>
                        </View>
                        {renderField('Contact Name', 'contactName', { placeholder: 'Your full name' })}
                        {renderField('Contact Phone', 'contactPhone', { placeholder: '10-digit number', keyboardType: 'phone-pad' })}
                        {renderField('Contact Email', 'contactEmail', { placeholder: 'email@example.com', keyboardType: 'email-address', required: false })}
                    </View>

                    {/* Society Size Section */}
                    <View className="mb-2">
                        <View className="flex-row items-center gap-2 mb-4 mt-2">
                            <Feather name="grid" size={18} color="#4f46e5" />
                            <Text className="text-indigo-600 font-bold text-sm">SOCIETY SIZE</Text>
                        </View>
                        {renderField('Total Flats', 'totalFlats', { placeholder: 'e.g. 120', keyboardType: 'number-pad' })}
                        {renderField('Monthly Maintenance Fee', 'monthlyFee', { placeholder: 'e.g. 3500', keyboardType: 'number-pad', prefix: '₹' })}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Submit Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-8">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${
                        submitting ? 'bg-gray-200' : 'bg-indigo-600'
                    }`}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text className="text-white font-bold text-base">Submitting...</Text>
                        </>
                    ) : (
                        <>
                            <Feather name="send" size={18} color="#fff" />
                            <Text className="text-white font-bold text-base">Submit Registration</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
