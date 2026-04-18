import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

interface Vehicle {
  id: string;
  vehicleNumber: string; // e.g. "MH01AB1234"
  vehicleType: string;   // "Car" | "Bike" | "Other"
  model: string;
  color: string;
  status: VehicleStatus;
  parkingSlot?: string;
  stickerNumber?: string;
  lastSeen?: string;
}

function normaliseVehicle(raw: any): Vehicle {
  return {
    id:            raw.id,
    vehicleNumber: raw.vehicleNumber ?? raw.number ?? '',
    vehicleType:   raw.vehicleType ?? raw.type ?? 'Other',
    model:         raw.model ?? '',
    color:         raw.color ?? '',
    status:        raw.status ?? 'PENDING',
    parkingSlot:   raw.parkingSlot ?? undefined,
    stickerNumber: raw.stickerNumber ?? undefined,
    lastSeen:      raw.lastSeen ?? undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusCfg = { bg: string; text: string; label: string };

function getStatusCfg(status: VehicleStatus): StatusCfg {
  switch (status) {
    case 'ACTIVE':   return { bg: SgateColors.greenBg,  text: SgateColors.green,    label: 'Active' };
    case 'PENDING':  return { bg: SgateColors.goldPale,  text: SgateColors.goldDeep, label: 'Pending Approval' };
    case 'REJECTED': return { bg: SgateColors.redBg,     text: SgateColors.red,       label: 'Rejected' };
  }
}

function getTypeIcon(vehicleType: string): { icon: React.ComponentProps<typeof Feather>['name']; bg: string; color: string } {
  const t = vehicleType.toUpperCase();
  if (t === 'CAR')  return { icon: 'truck', bg: SgateColors.blueBg,  color: SgateColors.blue };
  if (t === 'BIKE') return { icon: 'zap',   bg: SgateColors.greenBg, color: SgateColors.green };
  return { icon: 'circle', bg: SgateColors.surface, color: SgateColors.t2 };
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, index, onDelete }: { vehicle: Vehicle; index: number; onDelete: (id: string) => void }) {
  const statusCfg = getStatusCfg(vehicle.status);
  const typeIcon  = getTypeIcon(vehicle.vehicleType);
  const stickerIssued = !!vehicle.stickerNumber;

  const handleMenuPress = () => {
    AppAlert.show(
      vehicle.vehicleNumber,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Vehicle', style: 'destructive', onPress: () =>
          AppAlert.show('Delete Vehicle', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(vehicle.id) },
          ]),
        },
      ],
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={styles.card}>
        {/* Top row: icon + plate + menu */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeIconBubble, { backgroundColor: typeIcon.bg }]}>
            <Feather name={typeIcon.icon} size={20} color={typeIcon.color} />
          </View>
          <Text style={styles.plateNumber}>{vehicle.vehicleNumber}</Text>
          <TouchableOpacity onPress={handleMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="more-vertical" size={20} color={SgateColors.t2} />
          </TouchableOpacity>
        </View>

        {/* Model */}
        <Text style={styles.makeModel}>{vehicle.vehicleType} · {vehicle.model}</Text>

        {/* Detail row */}
        <View style={styles.detailRow}>
          <Feather name="droplet" size={12} color={SgateColors.t3} />
          <Text style={styles.detailText}>{vehicle.color}</Text>
          {vehicle.parkingSlot ? (
            <>
              <Text style={styles.detailSep}>{'  ·  '}</Text>
              <Feather name="map-pin" size={12} color={SgateColors.t3} />
              <Text style={styles.detailText}>{vehicle.parkingSlot}</Text>
            </>
          ) : null}
        </View>

        {/* Bottom row */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
          <View style={styles.flex1} />
          <View style={styles.stickerRow}>
            <Feather
              name={stickerIssued ? 'check-circle' : 'clock'}
              size={13}
              color={stickerIssued ? SgateColors.green : SgateColors.t4}
            />
            <Text style={[styles.stickerText, { color: stickerIssued ? SgateColors.green : SgateColors.t3 }]}>
              {'Sticker: ' + (stickerIssued ? vehicle.stickerNumber : 'Pending')}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyVehiclesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/resident/vehicles/my');
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw) ? raw : raw?.vehicles ?? [];
      setVehicles(list.map(normaliseVehicle));
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchVehicles(); }, []));

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resident/vehicles/${id}`);
      setVehicles(vs => vs.filter(v => v.id !== id));
    } catch (err) {
      AppAlert.show('Error', 'Could not delete vehicle. Please try again.');
    }
  };

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
        <View style={[styles.header, { paddingTop: 12 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Vehicles</Text>
          <TouchableOpacity onPress={() => router.push('/(resident)/vehicles/add' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="plus" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="truck" size={52} color={SgateColors.t4} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No vehicles registered</Text>
          <Text style={styles.emptySubtitle}>
            Register your vehicle to get a society sticker and enable automatic gate entry
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(resident)/vehicles/add' as any)} activeOpacity={0.85}>
            <Text style={styles.emptyButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <VehicleCard vehicle={item} index={index} onDelete={handleDelete} />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SgateColors.bg },
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontFamily: SgateFonts.bold, fontSize: 18, color: SgateColors.t1, marginBottom: 8 },
  emptySubtitle: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t3, textAlign: 'center', marginBottom: 24 },
  emptyButton: { backgroundColor: SgateColors.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  emptyButtonText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.black },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: { backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SgateColors.borderSoft },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIconBubble: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  plateNumber: { fontFamily: SgateFonts.extrabold, fontSize: 20, color: SgateColors.t1, flex: 1, letterSpacing: 1 },
  makeModel: { fontFamily: SgateFonts.medium, fontSize: 14, color: SgateColors.t2, marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  detailText: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t3 },
  detailSep: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t3 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: SgateFonts.bold, fontSize: 11 },
  flex1: { flex: 1 },
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stickerText: { fontFamily: SgateFonts.medium, fontSize: 12 },
  gold: { color: '#FFB800' },
});
