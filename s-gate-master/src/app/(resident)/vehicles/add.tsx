import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { VehicleType } from '../../../mocks/vehicles';

// ─── Type card config ─────────────────────────────────────────────────────────

interface TypeCardCfg {
  type: VehicleType;
  iconName: React.ComponentProps<typeof Feather>['name'];
  label: string;
}

const TYPE_CARDS: TypeCardCfg[] = [
  { type: 'CAR',   iconName: 'truck',  label: 'Car' },
  { type: 'BIKE',  iconName: 'zap',    label: 'Bike' },
  { type: 'OTHER', iconName: 'circle', label: 'Other' },
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

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'words',
  keyboardType = 'default',
  isLast = false,
}: FieldProps) {
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
  const [make, setMake]               = useState('');
  const [model, setModel]             = useState('');
  const [color, setColor]             = useState('');
  const [year, setYear]               = useState('');

  const isDisabled =
    !vehicleType ||
    !number.trim() ||
    !make.trim() ||
    !model.trim() ||
    !color.trim() ||
    !year.trim();

  function handleSubmit() {
    if (isDisabled) return;
    Alert.alert(
      'Registration Submitted',
      'Your vehicle has been submitted for approval. You will be notified once it is verified.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Vehicle</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Vehicle Type ──────────────────────────────────────────────── */}
          <View style={styles.typeSection}>
            <Text style={styles.typeSectionLabel}>Vehicle Type *</Text>

            <View style={styles.typeRow}>
              {TYPE_CARDS.map(cfg => {
                const isSelected = vehicleType === cfg.type;
                return (
                  <TouchableOpacity
                    key={cfg.type}
                    style={[
                      styles.typeCard,
                      isSelected ? styles.typeCardSelected : styles.typeCardUnselected,
                    ]}
                    onPress={() => setVehicleType(cfg.type)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.typeIconBubble,
                        { backgroundColor: isSelected ? SgateColors.goldDeep : SgateColors.surface },
                      ]}
                    >
                      <Feather
                        name={cfg.iconName}
                        size={18}
                        color={isSelected ? SgateColors.card : SgateColors.t2}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeCardLabel,
                        { color: isSelected ? SgateColors.t1 : SgateColors.t2 },
                      ]}
                    >
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
              placeholder="MH 01 AB 1234"
              autoCapitalize="characters"
            />
            <FormField
              label="MAKE *"
              value={make}
              onChangeText={setMake}
              placeholder="e.g. Maruti Suzuki"
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
            />
            <FormField
              label="YEAR *"
              value={year}
              onChangeText={setYear}
              placeholder="e.g. 2022"
              keyboardType="number-pad"
              isLast
            />
          </View>

          {/* ── RC Book Upload ────────────────────────────────────────────── */}
          <View style={styles.uploadCard}>
            <Text style={styles.uploadLabel}>RC Book *</Text>
            <TouchableOpacity
              style={styles.dashedBox}
              onPress={() =>
                Alert.alert('Upload', 'Camera and gallery upload coming soon.')
              }
              activeOpacity={0.75}
            >
              <Feather name="upload-cloud" size={28} color={SgateColors.t3} />
              <Text style={styles.uploadTitle}>Upload RC Book</Text>
              <Text style={styles.uploadHint}>JPG, PNG or PDF · Max 5MB</Text>
            </TouchableOpacity>
          </View>

          {/* ── Submit Button ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: isDisabled ? SgateColors.surface : SgateColors.gold },
            ]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.submitButtonText,
                { color: isDisabled ? SgateColors.t3 : SgateColors.black },
              ]}
            >
              Submit for Approval
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  flex1: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: {
    fontFamily: SgateFonts.bold,
    fontSize: 18,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Vehicle Type section
  typeSection: {
    marginTop: 16,
  },
  typeSectionLabel: {
    fontFamily: SgateFonts.semibold,
    fontSize: 13,
    color: SgateColors.t1,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  typeCardSelected: {
    borderWidth: 2,
    borderColor: SgateColors.gold,
    backgroundColor: SgateColors.goldPale,
  },
  typeCardUnselected: {
    borderWidth: 1.5,
    borderColor: SgateColors.borderSoft,
    backgroundColor: SgateColors.card,
  },
  typeIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCardLabel: {
    fontFamily: SgateFonts.semibold,
    fontSize: 13,
    marginTop: 8,
  },

  // Form Card
  formCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldWrapperLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontFamily: SgateFonts.semibold,
    fontSize: 12,
    color: SgateColors.t2,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  textInput: {
    height: 48,
    backgroundColor: SgateColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: SgateFonts.regular,
    fontSize: 14,
    color: SgateColors.t1,
  },

  // Upload Card
  uploadCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  uploadLabel: {
    fontFamily: SgateFonts.semibold,
    fontSize: 13,
    color: SgateColors.t1,
    marginBottom: 10,
  },
  dashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: SgateColors.border,
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    fontFamily: SgateFonts.medium,
    fontSize: 14,
    color: SgateColors.t2,
  },
  uploadHint: {
    fontFamily: SgateFonts.regular,
    fontSize: 11,
    color: SgateColors.t4,
  },

  // Submit Button
  submitButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: SgateFonts.bold,
    fontSize: 15,
  },
});
