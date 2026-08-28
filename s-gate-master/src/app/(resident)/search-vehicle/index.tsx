import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking, FlatList, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import * as Haptics from 'expo-haptics';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SafeBottomSheetSurface } from '../../../components/ui/SafeBottomSheetSurface';

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
    // Reset lookup state on screen focus (e.g. navigating back)
    setQuery('');
    setResult(null);
    setNotFound(false);
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

  // ─── Complaint Card ──────────────────────────────────────────────────────────
  const renderComplaint = ({ item, index }: { item: Complaint, index: number }) => {
    const isOpen = item.status === 'OPEN' || item.status === 'NOTIFIED';
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={S.complaintCard}>
        <View style={S.complaintHeader}>
          <Text style={S.complaintPlate}>{item.vehicleNumber}</Text>
          <View style={[S.cStatusBadge, !isOpen && { backgroundColor: SgateColors.surface }]}>
            <Text style={[S.cStatusText, !isOpen && { color: SgateColors.t3 }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={S.complaintType}>{item.type.replace('_', ' ')}</Text>
        <Text style={S.complaintDate}>{new Date(item.createdAt).toLocaleString()}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header + Tabs (one visual block) ────────────────────────────── */}
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Parking & Vehicles</Text>
            <View style={{ width: 22 }} />
          </View>
        </SafeAreaView>

        {/* ── Premium Segmented Control ─────────────────────────────────── */}
        <View style={S.segmentContainer}>
          <View style={S.segmentTrack}>
            <TouchableOpacity
              style={[S.segmentItem, tab === 'LOOKUP' && S.segmentItemActive]}
              onPress={() => setTab('LOOKUP')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="car-search-outline" size={16} color={tab === 'LOOKUP' ? SgateColors.t1 : '#9CA3AF'} />
              <Text style={[S.segmentText, tab === 'LOOKUP' && S.segmentTextActive]}>Lookup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.segmentItem, tab === 'MY_REPORTS' && S.segmentItemActive]}
              onPress={() => setTab('MY_REPORTS')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={tab === 'MY_REPORTS' ? SgateColors.t1 : '#9CA3AF'} />
              <Text style={[S.segmentText, tab === 'MY_REPORTS' && S.segmentTextActive]}>My Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Fixed spacing between header block and content */}
      <View style={{ height: 14 }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {tab === 'LOOKUP' ? (
          <ScrollView contentContainerStyle={S.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ── Search Card ──────────────────────────────────────────── */}
            <View style={S.searchCard}>
              <Text style={S.searchCardTitle}>Find a Vehicle</Text>
              <Text style={S.searchCardSub}>Enter a vehicle number to check if it is registered in the society.</Text>
              <View style={[S.inputRow, focused && S.inputRowFocused]}>
                <MaterialCommunityIcons name="car-outline" size={20} color={focused ? SgateColors.goldDeep : SgateColors.t4} style={{ marginRight: 10 }} />
                <TextInput
                  style={S.textInput}
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
              <TouchableOpacity style={[S.searchBtn, isSearchDisabled && S.searchBtnDisabled]} onPress={handleSearch} disabled={isSearchDisabled} activeOpacity={0.85}>
                {loading ? <ActivityIndicator size="small" color={SgateColors.t1} /> : <Text style={[S.searchBtnText, isSearchDisabled && S.searchBtnTextDisabled]}>Search</Text>}
              </TouchableOpacity>
            </View>

            {/* ── Found Result ─────────────────────────────────────────── */}
            {result && (
              <Animated.View entering={FadeInDown.springify()} style={S.resultCard}>
                <View style={S.foundBanner}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color={SgateColors.green} />
                  <Text style={S.foundBannerText}>Registered Vehicle</Text>
                </View>
                <Text style={S.vehicleNumber}>{result.vehicleNumber}</Text>
                <View style={S.detailRows}>
                  {result.flat?.flatNumber && (
                    <View style={S.detailRow}>
                      <View style={S.detailIconWrap}><MaterialCommunityIcons name="home-outline" size={14} color={SgateColors.goldDeep} /></View>
                      <Text style={S.detailLabel}>Flat</Text>
                      <Text style={S.detailValue}>{result.flat.flatNumber}</Text>
                    </View>
                  )}
                  <View style={S.detailRow}>
                    <View style={S.detailIconWrap}><MaterialCommunityIcons name="car-outline" size={14} color={SgateColors.goldDeep} /></View>
                    <Text style={S.detailLabel}>Vehicle</Text>
                    <Text style={S.detailValue}>{result.vehicleType} · {result.model} · {result.color}</Text>
                  </View>
                  {result.parkingSlot && (
                    <View style={S.detailRow}>
                      <View style={S.detailIconWrap}><MaterialCommunityIcons name="map-marker-outline" size={14} color={SgateColors.goldDeep} /></View>
                      <Text style={S.detailLabel}>Parking</Text>
                      <Text style={S.detailValue}>{result.parkingSlot}</Text>
                    </View>
                  )}
                </View>
                <View style={S.divider} />
                <View style={S.actionRow}>
                  {result.user?.phone && (
                    <TouchableOpacity style={S.callBtn} onPress={() => Linking.openURL('tel:' + result.user!.phone.replace(/\s/g, ''))} activeOpacity={0.8}>
                      <MaterialCommunityIcons name="phone-outline" size={16} color={SgateColors.green} />
                      <Text style={S.callBtnText}>Call Owner</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={S.reportBtnSec} onPress={() => setReportTarget(result.vehicleNumber)} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="alert-outline" size={16} color={SgateColors.t2} />
                    <Text style={S.reportBtnSecText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── Not Found ────────────────────────────────────────────── */}
            {notFound && (
              <Animated.View entering={FadeInDown.springify()} style={S.notFoundCard}>
                <View style={S.nfIconCircle}>
                  <MaterialCommunityIcons name="car-off" size={28} color={SgateColors.red} />
                </View>
                <Text style={S.nfTitle}>Vehicle Not Found</Text>
                <Text style={S.nfBody}>This vehicle number is not registered in the society directory.</Text>
                <TouchableOpacity style={S.nfReportBtn} onPress={() => setReportTarget(query.toUpperCase())} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="alert-outline" size={16} color={SgateColors.red} />
                  <Text style={S.nfReportText}>File Parking Complaint</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={complaints}
            keyExtractor={(item) => item.id}
            renderItem={renderComplaint}
            contentContainerStyle={S.listContent}
            refreshing={loadingComplaints}
            onRefresh={fetchMyComplaints}
            ListEmptyComponent={
              !loadingComplaints ? (
                <View style={S.emptyWrap}>
                  <View style={S.emptyIconCircle}>
                    <MaterialCommunityIcons name="shield-check-outline" size={32} color={SgateColors.goldDeep} />
                  </View>
                  <Text style={S.emptyTitle}>No Reports</Text>
                  <Text style={S.emptySub}>You haven&apos;t filed any parking complaints.</Text>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* ── Modal: File Complaint ───────────────────────────────────────── */}
      <Modal visible={!!reportTarget} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setReportTarget(null)}>
        <View style={S.modalOverlay}>
          <SafeBottomSheetSurface style={S.modalContent} showHandle minimumBottomPadding={20}>
            <Text style={S.modalTitle}>File Parking Complaint</Text>
            <Text style={S.modalSub}>Vehicle: {reportTarget}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={S.fieldLabel}>Issue Type</Text>
              <View style={S.tagsContainer}>
                {VIOLATION_TYPES.map(vt => (
                  <TouchableOpacity key={vt} style={[S.tag, rType === vt && S.tagActive]} onPress={() => setRType(vt)}>
                    <Text style={[S.tagText, rType === vt && S.tagTextActive]}>{vt.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={S.fieldLabel}>Description (Optional but helpful)</Text>
              <TextInput
                style={S.inputArea}
                placeholder="e.g. Blocking my parking spot since morning"
                placeholderTextColor={SgateColors.t4}
                value={rDesc}
                onChangeText={setRDesc}
                multiline
              />
              <View style={S.modalBtnRow}>
                <TouchableOpacity style={S.modalCancel} onPress={() => setReportTarget(null)}>
                  <Text style={S.modalCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.modalSubmit} onPress={submitComplaint} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={S.modalSubmitTxt}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeBottomSheetSurface>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },

  // Header
  headerBg: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12 },

  // Premium Segmented Control
  segmentContainer: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  segmentTrack: { flexDirection: 'row', backgroundColor: '#F4F4F5', borderRadius: 16, padding: 4 },
  segmentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 14, gap: 6,
  },
  segmentItemActive: {
    backgroundColor: SgateColors.gold,
    shadowColor: SgateColors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: '#9CA3AF' },
  segmentTextActive: { color: SgateColors.t1 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },
  listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

  // Search Card
  searchCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  searchCardTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
  searchCardSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16, lineHeight: 19 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 14, height: 52, borderWidth: 1.5, borderColor: 'transparent' },
  inputRowFocused: { borderColor: SgateColors.gold, backgroundColor: '#FFFFFF' },
  textInput: { flex: 1, fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1, letterSpacing: 1.5 },
  searchBtn: { marginTop: 14, backgroundColor: SgateColors.gold, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  searchBtnDisabled: { backgroundColor: '#E8E8E8' },
  searchBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  searchBtnTextDisabled: { color: SgateColors.t4 },

  // Found Result
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  foundBanner: { backgroundColor: SgateColors.greenBg, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  foundBannerText: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.green },
  vehicleNumber: { fontSize: 22, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, textAlign: 'center', marginBottom: 18, letterSpacing: 2 },
  detailRows: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, width: 60 },
  detailValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, flexShrink: 1 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginVertical: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: SgateColors.greenBg, gap: 6 },
  callBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.green },
  reportBtnSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, backgroundColor: '#F5F5F5', gap: 6 },
  reportBtnSecText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },

  // Not Found
  notFoundCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  nfIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: SgateColors.redBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  nfTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 6 },
  nfBody: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  nfReportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: SgateColors.red, backgroundColor: SgateColors.redBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  nfReportText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.red },

  // Complaints
  complaintCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  complaintPlate: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  cStatusBadge: { backgroundColor: SgateColors.goldPale, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cStatusText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  complaintType: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.red, marginBottom: 6 },
  complaintDate: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

  // Empty
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { paddingHorizontal: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  inputArea: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, height: 80, textAlignVertical: 'top' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  tagActive: { backgroundColor: SgateColors.goldPale, borderColor: SgateColors.gold },
  tagText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  tagTextActive: { color: SgateColors.goldDeep },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F5F5F5', alignItems: 'center' },
  modalCancelTxt: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
  modalSubmit: { flex: 1.2, paddingVertical: 14, borderRadius: 14, backgroundColor: SgateColors.red, alignItems: 'center' },
  modalSubmitTxt: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
