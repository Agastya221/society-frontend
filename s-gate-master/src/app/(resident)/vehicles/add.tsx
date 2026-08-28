import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors, SgateFonts, SgateLayout, SgateRadius, SgateSurfaces } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

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
    <View style={S.root}>
      <ScreenHeader title="Add Vehicle" subtitle="Register a vehicle for gate access" />
      <View style={S.headerGap} />

      <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={S.flex}
          contentContainerStyle={S.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Vehicle Type ──────────────────────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.label}>VEHICLE TYPE *</Text>
            <View style={S.typeRow}>
              {TYPE_CARDS.map(cfg => {
                const isSelected = vehicleType === cfg.type;
                return (
                  <Pressable
                    key={cfg.type}
                    onPress={() => setVehicleType(cfg.type)}
                    style={[S.typeCard, isSelected && S.typeCardActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View style={[S.typeIcon, isSelected && S.typeIconActive]}>
                      <MaterialCommunityIcons name={cfg.iconName} size={22} color={isSelected ? SgateColors.t1 : SgateColors.t3} />
                    </View>
                    <Text style={[S.typeText, isSelected && S.typeTextActive]} numberOfLines={2}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Details ───────────────────────────────────────────────────── */}
          <View style={S.formCard}>
            <Text style={S.fieldLabel}>LICENSE PLATE NUMBER *</Text>
            <TextInput
              style={S.input}
              value={number}
              onChangeText={setNumber}
              placeholder="e.g. MH01AB1234"
              placeholderTextColor={SgateColors.t4}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={S.fieldLabel}>MAKE / MODEL *</Text>
            <TextInput
              style={S.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Honda City"
              placeholderTextColor={SgateColors.t4}
              autoCapitalize="words"
            />

            <Text style={S.fieldLabel}>VEHICLE COLOR *</Text>
            <TextInput
              style={[S.input, S.lastInput]}
              value={color}
              onChangeText={setColor}
              placeholder="e.g. Matte Black"
              placeholderTextColor={SgateColors.t4}
              autoCapitalize="words"
            />
          </View>

          {/* ── Notice ────────────────────────────────────────────────────── */}
          <View style={S.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={SgateColors.goldDeep} />
            <Text style={S.infoText}>
              Your vehicle stays <Text style={S.infoStrong}>Pending Approval</Text> until administration verifies it and assigns a sticker.
            </Text>
          </View>

        </ScrollView>

        <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <PrimaryButton
            title={submitting ? 'Submitting…' : 'Submit Registration'}
            onPress={handleSubmit}
            disabled={isDisabled || submitting}
            isLoading={submitting}
            leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={SgateColors.t1} />}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },
  flex: { flex: 1 },
  headerGap: { height: SgateLayout.headerContentGap },
  content: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 14, paddingBottom: 20 },
  section: { marginBottom: 22 },
  label: { marginBottom: 10, fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, minHeight: 118, paddingHorizontal: 8, paddingVertical: 14, borderRadius: SgateRadius.md, borderWidth: 1, borderColor: SgateColors.borderSoft, backgroundColor: SgateColors.card, alignItems: 'center', justifyContent: 'center' },
  typeCardActive: { borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
  typeIcon: { width: 44, height: 44, marginBottom: 9, borderRadius: 22, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  typeIconActive: { backgroundColor: SgateColors.gold },
  typeText: { fontSize: 12, lineHeight: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2, textAlign: 'center' },
  typeTextActive: { color: SgateColors.t1, fontFamily: SgateFonts.bold },
  formCard: { ...SgateSurfaces.card, padding: 18, marginBottom: 16 },
  fieldLabel: { marginBottom: 7, fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.7 },
  input: { ...SgateSurfaces.input, paddingHorizontal: 14, marginBottom: 16, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
  lastInput: { marginBottom: 0 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginBottom: 20, borderRadius: SgateRadius.md, borderWidth: 1, borderColor: '#FFE39A', backgroundColor: SgateColors.goldPale },
  infoText: { flex: 1, fontSize: 12, lineHeight: 19, fontFamily: SgateFonts.regular, color: SgateColors.t2 },
  infoStrong: { fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  bottomBar: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft, backgroundColor: SgateColors.card },
});
