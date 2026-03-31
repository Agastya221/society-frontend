import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Type card config ─────────────────────────────────────────────────────────

// Backend vehicleType is: "Car" | "Bike" | "Other" (title-cased)
type VehicleType = 'Car' | 'Bike' | 'Other';

interface TypeCardCfg {
  type: VehicleType;
  iconName: React.ComponentProps<typeof Feather>['name'];
  label: string;
}

const TYPE_CARDS: TypeCardCfg[] = [
  { type: 'Car',   iconName: 'truck',  label: 'Car' },
  { type: 'Bike',  iconName: 'zap',    label: 'Bike' },
  { type: 'Other', iconName: 'circle', label: 'Other' },
];

// ─── Field row helper ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'number-pad';
  isLast?: boolean;
}

function FormField({ label, value, onChangeText, placeholder, autoCapitalize = 'words', keyboardType = 'default', isLast = false }: FieldProps) {
  return (
    <View style={[styles.fieldWrapper, isLast && styles.fieldWrapperLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SgateColors.t4}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddVehicleScreen() {
  const router = useRouter();

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [number, setNumber]           = useState('');
  const [model, setModel]             = useState('');
  const [color, setColor]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Backend only needs: vehicleNumber, vehicleType, model, color
  // "make" and "year" are NOT in the backend schema — removed from form
  const isDisabled = !vehicleType || !number.trim() || !model.trim() || !color.trim();

  const handleSubmit = async () => {
    if (isDisabled || submitting) return;

    // Normalise vehicle number: uppercase, remove spaces
    const normalisedNumber = number.trim().toUpperCase().replace(/\s+/g, '');

    setSubmitting(true);
    try {
      await api.post('/resident/vehicles', {
        vehicleNumber: normalisedNumber,
        vehicleType:   vehicleType,   // "Car" | "Bike" | "Other"
        model:         model.trim(),
        color:         color.trim(),
      });

      Alert.alert(
        'Vehicle Submitted ✅',
        'Your vehicle registration has been submitted. It will be visible once approved by the admin.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not register vehicle. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Vehicle</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Vehicle Type ──────────────────────────────────────────────── */}
          <View style={styles.typeSection}>
            <Text style={styles.typeSectionLabel}>Vehicle Type *</Text>
            <View style={styles.typeRow}>
              {TYPE_CARDS.map(cfg => {
                const isSelected = vehicleType === cfg.type;
                return (
                  <TouchableOpacity
                    key={cfg.type}
                    style={[styles.typeCard, isSelected ? styles.typeCardSelected : styles.typeCardUnselected]}
                    onPress={() => setVehicleType(cfg.type)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.typeIconBubble, { backgroundColor: isSelected ? SgateColors.goldDeep : SgateColors.surface }]}>
                      <Feather name={cfg.iconName} size={18} color={isSelected ? SgateColors.card : SgateColors.t2} />
                    </View>
                    <Text style={[styles.typeCardLabel, { color: isSelected ? SgateColors.t1 : SgateColors.t2 }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Form Fields ───────────────────────────────────────────────── */}
          <View style={styles.formCard}>
            <FormField
              label="VEHICLE NUMBER *"
              value={number}
              onChangeText={setNumber}
              placeholder="MH01AB1234"
              autoCapitalize="characters"
            />
            <FormField
              label="MODEL *"
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Swift"
            />
            <FormField
              label="COLOUR *"
              value={color}
              onChangeText={setColor}
              placeholder="e.g. White"
              isLast
            />
          </View>

          {/* ── Note ──────────────────────────────────────────────────────── */}
          <View style={styles.noteCard}>
            <Feather name="info" size={14} color={SgateColors.t3} />
            <Text style={styles.noteText}>
              Your vehicle will be in <Text style={styles.noteBold}>Pending Approval</Text> status until the society admin verifies and assigns a parking slot and sticker.
            </Text>
          </View>

          {/* ── Submit Button ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: isDisabled || submitting ? SgateColors.surface : SgateColors.gold }]}
            onPress={handleSubmit}
            disabled={isDisabled || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={SgateColors.black} />
            ) : (
              <Text style={[styles.submitButtonText, { color: isDisabled ? SgateColors.t3 : SgateColors.black }]}>
                Submit for Approval
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SgateColors.bg },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontFamily: SgateFonts.bold, fontSize: 18, color: SgateColors.t1, flex: 1, marginLeft: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  typeSection: { marginTop: 16 },
  typeSectionLabel: { fontFamily: SgateFonts.semibold, fontSize: 13, color: SgateColors.t1, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  typeCardSelected: { borderWidth: 2, borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
  typeCardUnselected: { borderWidth: 1.5, borderColor: SgateColors.borderSoft, backgroundColor: SgateColors.card },
  typeIconBubble: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  typeCardLabel: { fontFamily: SgateFonts.semibold, fontSize: 13, marginTop: 8 },
  formCard: { backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: SgateColors.borderSoft },
  fieldWrapper: { marginBottom: 16 },
  fieldWrapperLast: { marginBottom: 0 },
  fieldLabel: { fontFamily: SgateFonts.semibold, fontSize: 12, color: SgateColors.t2, marginBottom: 6, letterSpacing: 0.3 },
  textInput: { height: 48, backgroundColor: SgateColors.surface, borderRadius: 12, paddingHorizontal: 14, fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t1 },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: SgateColors.surface, borderRadius: 12, padding: 12, marginTop: 14 },
  noteText: { flex: 1, fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, lineHeight: 18 },
  noteBold: { fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  submitButton: { marginTop: 20, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { fontFamily: SgateFonts.bold, fontSize: 15 },
});
