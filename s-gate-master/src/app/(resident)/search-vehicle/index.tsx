import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import * as Haptics from 'expo-haptics';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface VehicleResult {
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  color: string;
  status: string;
  parkingSlot?: string;
  stickerNumber?: string;
  lastSeen?: string;
  flat?: { flatNumber: string };
  user?: { name: string; phone: string };
}

interface Complaint {
  id: string;
  vehicleNumber: string;
  type: string;
  source: 'COMPLAINT';
  status: 'OPEN' | 'NOTIFIED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

const VIOLATION_TYPES = [
  'WRONG_PARKING', 'DOUBLE_PARKING', 'BLOCKING_GATE',
  'UNAUTHORIZED_SPOT', 'NO_STICKER', 'OTHER',
];

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function SearchVehicleScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'LOOKUP' | 'MY_REPORTS'>('LOOKUP');

  // Lookup State
  const [query, setQuery]         = useState('');
  const [result, setResult]       = useState<VehicleResult | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [focused, setFocused]     = useState(false);

  // Complaints State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // File Complaint Modal
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [rType, setRType] = useState('WRONG_PARKING');
  const [rDesc, setRDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── API Methods ─────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const normalised = query.trim().replace(/\s+/g, '').toUpperCase();
    if (normalised.length < 4) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.get('/resident/vehicles/search', {
        params: { vehicleNumber: normalised },
      });
      const data = res.data?.data ?? res.data;
      if (data && data.vehicleNumber) {
        setResult(data);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        AppAlert.show('Error', 'Could not search. Please try again.');
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await api.get('/resident/parking/complaints');
      const data = res.data?.data ?? [];
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch parking complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (tab === 'MY_REPORTS') fetchMyComplaints();
  }, [tab]));

  const submitComplaint = async () => {
    if (!reportTarget) return;
    setSubmitting(true);
    try {
      await api.post('/resident/parking/complaints', {
        vehicleNumber: reportTarget,
        type: rType,
        description: rDesc.trim()
      });
      AppAlert.show('Submitted', 'Your complaint has been sent to the admin/guard.');
      setReportTarget(null); setRDesc(''); setRType('WRONG_PARKING');
      setTab('MY_REPORTS');
      fetchMyComplaints();
    } catch (err: any) {
      AppAlert.show('Error', err?.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setQuery(''); setResult(null); setNotFound(false);
  };

  const isSearchDisabled = query.trim().length < 4 || loading;

  // ─── Renderers ───────────────────────────────────────────────────────────────
  const renderComplaint = ({ item, index }: { item: Complaint, index: number }) => {
    const isOpen = item.status === 'OPEN' || item.status === 'NOTIFIED';
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.complaintCard}>
        <View style={styles.complaintHeader}>
          <Text style={styles.complaintPlate}>{item.vehicleNumber}</Text>
          <View style={[styles.statusBadge, !isOpen && { backgroundColor: SgateColors.surface }]}>
            <Text style={[styles.statusText, !isOpen && { color: SgateColors.t3 }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.complaintType}>{item.type.replace('_', ' ')}</Text>
        <Text style={styles.complaintDate}>{new Date(item.createdAt).toLocaleString()}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parking & Vehicles</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'LOOKUP' && styles.tabActive]} onPress={() => setTab('LOOKUP')}>
          <Text style={[styles.tabText, tab === 'LOOKUP' && styles.tabTextActive]}>Lookup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'MY_REPORTS' && styles.tabActive]} onPress={() => setTab('MY_REPORTS')}>
          <Text style={[styles.tabText, tab === 'MY_REPORTS' && styles.tabTextActive]}>My Reports</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {tab === 'LOOKUP' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.searchCard}>
              <Text style={styles.searchCardTitle}>Find a Vehicle</Text>
              <Text style={styles.searchCardSubtitle}>Enter a vehicle number to check if it is registered in the society.</Text>
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
              <TouchableOpacity style={[styles.searchBtn, isSearchDisabled && styles.searchBtnDisabled]} onPress={handleSearch} disabled={isSearchDisabled} activeOpacity={0.85}>
                {loading ? <ActivityIndicator size="small" color={SgateColors.card} /> : <Text style={[styles.searchBtnText, isSearchDisabled && styles.searchBtnTextDisabled]}>Search</Text>}
              </TouchableOpacity>
            </View>

            {result && (
              <Animated.View entering={FadeInDown.springify()} style={[styles.resultCard, styles.foundCard]}>
                <View style={styles.foundHeader}>
                  <Feather name="check-circle" size={20} color={SgateColors.green} />
                  <Text style={styles.foundHeaderText}>Registered Vehicle</Text>
                </View>
                <Text style={styles.vehicleNumber}>{result.vehicleNumber}</Text>
                <View style={styles.detailRows}>
                  {result.flat?.flatNumber && (
                    <View style={styles.detailRow}>
                      <Feather name="home" size={15} color={SgateColors.t3} />
                      <Text style={styles.detailLabel}>Flat</Text>
                      <Text style={styles.detailValue}>{result.flat.flatNumber}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Feather name="truck" size={15} color={SgateColors.t3} />
                    <Text style={styles.detailLabel}>Vehicle</Text>
                    <Text style={styles.detailValue}>{result.vehicleType} · {result.model} · {result.color}</Text>
                  </View>
                  {result.parkingSlot && (
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={15} color={SgateColors.t3} />
                      <Text style={styles.detailLabel}>Parking</Text>
                      <Text style={styles.detailValue}>{result.parkingSlot}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.divider} />
                <View style={styles.actionRow}>
                  {result.user?.phone && (
                    <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:' + result.user!.phone.replace(/\s/g, ''))} activeOpacity={0.8}>
                      <Feather name="phone" size={15} color={SgateColors.green} />
                      <Text style={styles.callBtnText}>Call Owner</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.reportBtnSecondary} onPress={() => setReportTarget(result.vehicleNumber)} activeOpacity={0.8}>
                    <Feather name="alert-triangle" size={15} color={SgateColors.t2} />
                    <Text style={styles.reportBtnSecondaryText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {notFound && (
               <Animated.View entering={FadeInDown.springify()} style={[styles.resultCard, styles.notFoundCard]}>
                <View style={styles.notFoundHeader}>
                  <Feather name="x-circle" size={20} color={SgateColors.red} />
                  <Text style={styles.notFoundHeaderText}>Vehicle Not Found</Text>
                </View>
                <Text style={styles.notFoundBody}>This vehicle number is not registered in the society directory.</Text>
                <TouchableOpacity style={styles.reportUnknownBtn} onPress={() => setReportTarget(query.toUpperCase())} activeOpacity={0.8}>
                  <Text style={styles.reportUnknownText}>File Parking Complaint</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={complaints}
            keyExtractor={(item) => item.id}
            renderItem={renderComplaint}
            contentContainerStyle={styles.listContent}
            refreshing={loadingComplaints}
            onRefresh={fetchMyComplaints}
            ListEmptyComponent={
              !loadingComplaints ? (
                <View style={styles.emptyWrap}>
                  <Feather name="shield" size={48} color={SgateColors.t4} />
                  <Text style={styles.emptyTitle}>No Reports</Text>
                  <Text style={styles.emptySub}>You haven't filed any parking complaints.</Text>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Modal: File Complaint */}
      <Modal visible={!!reportTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>File Parking Complaint</Text>
            <Text style={styles.modalSub}>Vehicle: {reportTarget}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.fieldLabel}>Issue Type</Text>
              <View style={styles.tagsContainer}>
                  {VIOLATION_TYPES.map(vt => (
                      <TouchableOpacity key={vt} style={[styles.tag, rType === vt && styles.tagActive]} onPress={() => setRType(vt)}>
                          <Text style={[styles.tagText, rType === vt && styles.tagTextActive]}>{vt.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.fieldLabel}>Description (Optional but helpful)</Text>
              <TextInput
                  style={styles.inputArea}
                  placeholder="e.g. Blocking my parking spot since morning"
                  placeholderTextColor={SgateColors.t4}
                  value={rDesc}
                  onChangeText={setRDesc}
                  multiline
              />

              <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setReportTarget(null)}>
                      <Text style={styles.modalCancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmit} onPress={submitComplaint} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitTxt}>Submit</Text>}
                  </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  headerSpacer: { width: 22 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: SgateColors.blue },
  tabText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
  tabTextActive: { color: SgateColors.blue },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },
  listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

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

  // Complaints Tab
  complaintCard: { backgroundColor: SgateColors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SgateColors.borderSoft },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  complaintPlate: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  statusBadge: { backgroundColor: SgateColors.goldPale, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  complaintType: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.red, marginBottom: 6 },
  complaintDate: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: SgateColors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  inputArea: { backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, height: 80, textAlignVertical: 'top' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border },
  tagActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
  tagText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  tagTextActive: { color: '#fff' },

  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: SgateColors.surface, alignItems: 'center' },
  modalCancelTxt: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  modalSubmit: { flex: 1.2, paddingVertical: 14, borderRadius: 14, backgroundColor: SgateColors.red, alignItems: 'center' },
  modalSubmitTxt: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
