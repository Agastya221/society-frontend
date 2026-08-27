import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Type card config ─────────────────────────────────────────────────────────

type VehicleType = 'Car' | 'Bike' | 'Other';

interface TypeCardCfg {
  type: VehicleType;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}

const TYPE_CARDS: TypeCardCfg[] = [
  { type: 'Car',   iconName: 'car',  label: 'Four Wheeler' },
  { type: 'Bike',  iconName: 'motorbike',    label: 'Two Wheeler' },
  { type: 'Other', iconName: 'view-grid-plus', label: 'Other' },
];

export default function AddVehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [number, setNumber]           = useState('');
  const [model, setModel]             = useState('');
  const [color, setColor]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const isDisabled = !vehicleType || !number.trim() || !model.trim() || !color.trim();

  const handleSubmit = async () => {
    if (isDisabled || submitting) return;

    const normalisedNumber = number.trim().toUpperCase().replace(/\s+/g, '');
    setSubmitting(true);
    try {
      await api.post('/resident/vehicles', {
        vehicleNumber: normalisedNumber,
        vehicleType:   vehicleType,
        model:         model.trim(),
        color:         color.trim(),
      });

      AppAlert.show(
        'Vehicle Submitted',
        'Your registration was sent. It will be active once approved by administration.',
        [{ text: 'Great', onPress: () => router.back() }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not register vehicle. Please try again.';
      AppAlert.show('Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
        <View 
          className="px-5 flex-row items-center gap-3 bg-white border-b border-gray-100"
          style={{ paddingTop: 12, paddingBottom: 16 }}
        >
          <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="arrow-back" size={24} className="text-gray-700" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Add Vehicle</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Vehicle Type ──────────────────────────────────────────────── */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Vehicle Type *</Text>
            <View className="flex-row gap-3">
              {TYPE_CARDS.map(cfg => {
                const isSelected = vehicleType === cfg.type;
                return (
                  <TouchableOpacity
                    key={cfg.type}
                    onPress={() => setVehicleType(cfg.type)}
                    activeOpacity={0.7}
                    className={`flex-1 rounded-2xl items-center py-4 border-2 ${
                      isSelected ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-100 shadow-sm'
                    }`}
                  >
                    <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                      isSelected ? 'bg-yellow-400' : 'bg-gray-100'
                    }`}>
                      <MaterialCommunityIcons name={cfg.iconName} size={22} color={isSelected ? 'black' : '#6b7280'} />
                    </View>
                    <Text className={`text-[13px] font-bold ${
                      isSelected ? 'text-yellow-800' : 'text-gray-600'
                    }`}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Details ───────────────────────────────────────────────────── */}
          <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">License Plate Number *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-5 font-medium text-gray-900 text-[15px]"
              value={number}
              onChangeText={setNumber}
              placeholder="e.g. MH01AB1234"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />

            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Make / Model *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-5 font-medium text-gray-900 text-[15px]"
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Honda City"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />

            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vehicle Color *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 font-medium text-gray-900 text-[15px]"
              value={color}
              onChangeText={setColor}
              placeholder="e.g. Matte Black"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />
          </View>

          {/* ── Notice ────────────────────────────────────────────────────── */}
          <View className="flex-row items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-2xl p-4 mb-8">
            <View className="mt-0.5">
              <Ionicons name="information-circle" size={20} color="#ca8a04" />
            </View>
            <Text className="flex-1 text-sm text-yellow-900 leading-5">
              Your vehicle will be marked as <Text className="font-bold">Pending Approval</Text> until administration verifies it and assigns your official sticker.
            </Text>
          </View>

          {/* ── Submit Button ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={{ shadowColor: '#eab308', shadowOpacity: submitting || isDisabled ? 0 : 0.25, shadowRadius: 10, elevation: 2 }}
            className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${isDisabled || submitting ? 'bg-gray-300' : 'bg-yellow-400'}`}
            onPress={handleSubmit}
            disabled={isDisabled || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="shield-checkmark" size={20} color={isDisabled ? '#9ca3af' : 'black'} />
            )}
            <Text className={`text-base font-bold ${isDisabled ? 'text-gray-500' : 'text-black'}`}>
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
