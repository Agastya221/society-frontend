import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
FlatList,
  Platform, StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  color: string;
  status: VehicleStatus;
  parkingSlot?: string;
  stickerNumber?: string;
  lastSeen?: string;
}

function normaliseVehicle(raw: any): Vehicle {
  return {
    id: raw.id,
    vehicleNumber: raw.vehicleNumber ?? raw.number ?? '',
    vehicleType: raw.vehicleType ?? raw.type ?? 'Other',
    model: raw.model ?? '',
    color: raw.color ?? '',
    status: raw.status ?? 'PENDING',
    parkingSlot: raw.parkingSlot ?? undefined,
    stickerNumber: raw.stickerNumber ?? undefined,
    lastSeen: raw.lastSeen ?? undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusCfg = { bg: string; text: string; label: string };

function getStatusCfg(status: VehicleStatus): StatusCfg {
  switch (status) {
    case 'ACTIVE': return { bg: SgateColors.greenBg, text: SgateColors.green, label: 'Active' };
    case 'PENDING': return { bg: SgateColors.goldPale, text: SgateColors.goldDeep, label: 'Pending Approval' };
    case 'REJECTED': return { bg: SgateColors.redBg, text: SgateColors.red, label: 'Rejected' };
  }
}

// Vehicle type → MaterialCommunityIcons (same icon package as Daily Help)
function getTypeIcon(vehicleType: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const t = vehicleType.toUpperCase();
  if (t === 'CAR') return 'car';
  if (t === 'BIKE') return 'motorbike';
  if (t === 'SCOOTER') return 'moped';
  return 'car-side';
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, index, onDelete }: { vehicle: Vehicle; index: number; onDelete: (id: string) => void }) {
  const statusCfg = getStatusCfg(vehicle.status);
  const typeIcon = getTypeIcon(vehicle.vehicleType);
  const stickerIssued = !!vehicle.stickerNumber;

  const handleMenuPress = () => {
    AppAlert.show(
      vehicle.vehicleNumber,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Vehicle', style: 'destructive', onPress: () =>
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
      <TouchableOpacity style={S.card} activeOpacity={0.97}>
        {/* Top row: icon + plate + menu */}
        <View style={S.cardTopRow}>
          <View style={S.typeIconBubble}>
            <MaterialCommunityIcons name={typeIcon} size={22} color={SgateColors.goldDeep} />
          </View>
          <View style={S.plateArea}>
            <Text style={S.plateNumber}>{vehicle.vehicleNumber}</Text>
            <Text style={S.makeModel}>{vehicle.vehicleType}{vehicle.model ? ` · ${vehicle.model}` : ''}</Text>
          </View>
          <TouchableOpacity
            style={S.menuBtn}
            onPress={handleMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="more-vertical" size={18} color={SgateColors.t3} />
          </TouchableOpacity>
        </View>

        {/* Detail chips */}
        <View style={S.detailRow}>
          {vehicle.color ? (
            <View style={S.detailChip}>
              <View style={[S.colorDot, { backgroundColor: getColorHex(vehicle.color) }]} />
              <Text style={S.detailChipText}>{vehicle.color}</Text>
            </View>
          ) : null}
          {vehicle.parkingSlot ? (
            <View style={S.detailChip}>
              <Feather name="map-pin" size={11} color={SgateColors.t3} />
              <Text style={S.detailChipText}>{vehicle.parkingSlot}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom status row */}
        <View style={S.cardBottomRow}>
          <View style={[S.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[S.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={S.stickerRow}>
            <Feather
              name={stickerIssued ? 'check-circle' : 'clock'}
              size={13}
              color={stickerIssued ? SgateColors.green : SgateColors.t4}
            />
            <Text style={[S.stickerText, { color: stickerIssued ? SgateColors.green : SgateColors.t3 }]}>
              {'Sticker: ' + (stickerIssued ? vehicle.stickerNumber : 'Pending')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Map color names to hex for the dot indicator
function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    white: '#E0E0E0', black: '#333', red: '#E53935', blue: '#1E88E5',
    silver: '#B0BEC5', grey: '#9E9E9E', gray: '#9E9E9E', green: '#43A047',
    yellow: '#FDD835', orange: '#FB8C00', brown: '#6D4C41', gold: '#FFB800',
    maroon: '#880E4F', beige: '#D7CCC8', navy: '#1A237E', purple: '#7B1FA2',
  };
  return map[colorName.toLowerCase()] ?? SgateColors.t4;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyVehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

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
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header (edge-to-edge) ─────────────────────────────────────── */}
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={S.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>My Vehicles</Text>
            <TouchableOpacity
              style={S.headerAddBtn}
              onPress={() => router.push('/(resident)/vehicles/add' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus" size={18} color={SgateColors.goldDeep} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <AppLoader />
      ) : vehicles.length === 0 ? (
        <View style={S.emptyContainer}>
          <View style={S.emptyIconCircle}>
            <MaterialCommunityIcons name="car-outline" size={36} color={SgateColors.goldDeep} />
          </View>
          <Text style={S.emptyTitle}>No vehicles added</Text>
          <Text style={S.emptySubtitle}>
            Add your vehicle for smoother gate entry and society sticker assignment
          </Text>
          <TouchableOpacity
            style={S.emptyAddBtn}
            onPress={() => router.push('/(resident)/vehicles/add' as any)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color={SgateColors.t1} />
            <Text style={S.emptyAddBtnText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={vehicles}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={S.listContent}
            renderItem={({ item, index }) => (
              <VehicleCard vehicle={item} index={index} onDelete={handleDelete} />
            )}
            ListFooterComponent={
              vehicles.length > 0 ? (
                <View style={S.helperSection}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={SgateColors.t4} />
                  <Text style={S.helperText}>Add more vehicles for easy access and gate entry</Text>
                </View>
              ) : null
            }
          />

          {/* ── Floating Add Button ─────────────────────────────────────── */}
          <TouchableOpacity
            style={S.fab}
            onPress={() => router.push('/(resident)/vehicles/add' as any)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={24} color={SgateColors.t1} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // ── Header ────────────────────────────────────────────────────────────
  headerBg: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginLeft: 12,
  },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── List ──────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // ── Vehicle Card ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: SgateColors.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateArea: {
    flex: 1,
  },
  plateNumber: {
    fontFamily: SgateFonts.extrabold,
    fontSize: 18,
    color: SgateColors.t1,
    letterSpacing: 0.8,
  },
  makeModel: {
    fontFamily: SgateFonts.regular,
    fontSize: 14,
    color: SgateColors.t2,
    marginTop: 2,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Detail Chips ──────────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailChipText: {
    fontFamily: SgateFonts.medium,
    fontSize: 12,
    color: SgateColors.t2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  // ── Bottom Status Row ─────────────────────────────────────────────────
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontFamily: SgateFonts.bold,
    fontSize: 11,
  },
  stickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stickerText: {
    fontFamily: SgateFonts.medium,
    fontSize: 12,
  },

  // ── Helper Section ────────────────────────────────────────────────────
  helperSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  helperText: {
    fontFamily: SgateFonts.regular,
    fontSize: 13,
    color: SgateColors.t4,
  },

  // ── Empty State ───────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: SgateFonts.bold,
    fontSize: 18,
    color: SgateColors.t1,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: SgateFonts.regular,
    fontSize: 13,
    color: SgateColors.t3,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SgateColors.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyAddBtnText: {
    fontFamily: SgateFonts.bold,
    fontSize: 15,
    color: SgateColors.t1,
  },

  // ── FAB ───────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: SgateColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SgateColors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
