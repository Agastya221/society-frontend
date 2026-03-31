import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface VehicleResult {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  color: string;
  status: string;          // ACTIVE | PENDING | REJECTED
  parkingSlot?: string;
  stickerNumber?: string;
  lastSeen?: string;
  flat?: { flatNumber: string };
  user?: { name: string; phone: string };
}

// ─── Result Cards ──────────────────────────────────────────────────────────────
function FoundCard({ data }: { data: VehicleResult }) {
  const handleCall = () => {
    if (data.user?.phone) Linking.openURL('tel:' + data.user.phone.replace(/\s/g, ''));
  };

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.resultCard, styles.foundCard]}>
      <View style={styles.foundHeader}>
        <Feather name="check-circle" size={20} color={SgateColors.green} />
        <Text style={styles.foundHeaderText}>Vehicle Found in Society</Text>
      </View>
      <Text style={styles.vehicleNumber}>{data.vehicleNumber}</Text>
      <View style={styles.detailRows}>
        {data.flat?.flatNumber && (
          <View style={styles.detailRow}>
            <Feather name="home" size={15} color={SgateColors.t3} />
            <Text style={styles.detailLabel}>Flat</Text>
            <Text style={styles.detailValue}>{data.flat.flatNumber}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Feather name="truck" size={15} color={SgateColors.t3} />
          <Text style={styles.detailLabel}>Vehicle</Text>
          <Text style={styles.detailValue}>{data.vehicleType} · {data.model} · {data.color}</Text>
        </View>
        {data.parkingSlot && (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={15} color={SgateColors.t3} />
            <Text style={styles.detailLabel}>Parking</Text>
            <Text style={styles.detailValue}>{data.parkingSlot}</Text>
          </View>
        )}
        {data.lastSeen && (
          <View style={styles.detailRow}>
            <Feather name="clock" size={15} color={SgateColors.t3} />
            <Text style={styles.detailLabel}>Last seen</Text>
            <Text style={styles.detailValue}>{new Date(data.lastSeen).toLocaleString()}</Text>
          </View>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.actionRow}>
        {data.user?.phone && (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
            <Feather name="phone" size={15} color={SgateColors.green} />
            <Text style={styles.callBtnText}>Call Owner</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.reportBtnSecondary}
          onPress={() => Alert.alert('Reported', 'Issue reported to the security team.')}
          activeOpacity={0.8}
        >
          <Feather name="alert-triangle" size={15} color={SgateColors.t2} />
          <Text style={styles.reportBtnSecondaryText}>Report Issue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function NotFoundCard() {
  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.resultCard, styles.notFoundCard]}>
      <View style={styles.notFoundHeader}>
        <Feather name="x-circle" size={20} color={SgateColors.red} />
        <Text style={styles.notFoundHeaderText}>Vehicle Not Found</Text>
      </View>
      <Text style={styles.notFoundBody}>
        This vehicle number is not registered in the society directory.
      </Text>
      <TouchableOpacity
        style={styles.reportUnknownBtn}
        onPress={() => Alert.alert('Report Submitted', 'The security team has been notified about this vehicle.')}
        activeOpacity={0.8}
      >
        <Text style={styles.reportUnknownText}>Report Unknown Vehicle</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function SearchVehicleScreen() {
  const router = useRouter();
  const [query, setQuery]         = useState('');
  const [result, setResult]       = useState<VehicleResult | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [focused, setFocused]     = useState(false);

  const handleSearch = async () => {
    const normalised = query.trim().replace(/\s+/g, '').toUpperCase();
    if (normalised.length < 4) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await api.get('/resident/vehicles/search', {
        params: { vehicleNumber: normalised },
      });
      const data = res.data?.data ?? res.data;
      if (data && data.id) {
        setResult(data);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        Alert.alert('Error', 'Could not search. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setNotFound(false);
  };

  const isSearchDisabled = query.trim().length < 4 || loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Vehicle</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.searchCard}>
            <Text style={styles.searchCardTitle}>Find a Vehicle</Text>
            <Text style={styles.searchCardSubtitle}>
              Enter a vehicle number to check if it is registered in the society.
            </Text>
            <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
              <Feather name="truck" size={18} color={SgateColors.t3} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="MH01AB1234"
                placeholderTextColor={SgateColors.t4}
                autoCapitalize="characters"
                value={query}
                onChangeText={t => { setQuery(t.toUpperCase()); setResult(null); setNotFound(false); }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={18} color={SgateColors.t3} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, isSearchDisabled && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={isSearchDisabled}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color={SgateColors.card} />
                : <Text style={[styles.searchBtnText, isSearchDisabled && styles.searchBtnTextDisabled]}>Search</Text>
              }
            </TouchableOpacity>
          </View>

          {result && <FoundCard data={result} />}
          {notFound && <NotFoundCard />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, flex: 1, marginLeft: 12 },
  headerSpacer: { width: 22 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  searchCard: { backgroundColor: SgateColors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: SgateColors.borderSoft },
  searchCardTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
  searchCardSubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderRadius: 14, paddingHorizontal: 14, height: 52, borderWidth: 1.5, borderColor: 'transparent' },
  inputRowFocused: { borderColor: SgateColors.gold },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1, letterSpacing: 1.5 },
  searchBtn: { marginTop: 12, backgroundColor: SgateColors.black, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' },
  searchBtnDisabled: { backgroundColor: SgateColors.surface },
  searchBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.card },
  searchBtnTextDisabled: { color: SgateColors.t3 },
  resultCard: { backgroundColor: SgateColors.card, borderRadius: 18, padding: 20, borderWidth: 2, marginTop: 20 },
  foundCard: { borderColor: SgateColors.green },
  foundHeader: { backgroundColor: SgateColors.greenBg, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  foundHeaderText: { flex: 1, fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.green },
  vehicleNumber: { fontSize: 24, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  detailRows: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, width: 70 },
  detailValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, flexShrink: 1 },
  divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: SgateColors.greenBg, gap: 6 },
  callBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.green },
  reportBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: SgateColors.surface, gap: 6 },
  reportBtnSecondaryText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  notFoundCard: { borderColor: SgateColors.red },
  notFoundHeader: { backgroundColor: SgateColors.redBg, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  notFoundHeaderText: { flex: 1, fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red },
  notFoundBody: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  reportUnknownBtn: { borderWidth: 1.5, borderColor: SgateColors.red, backgroundColor: SgateColors.redBg, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  reportUnknownText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.red },
});
