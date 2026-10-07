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
import { ScreenHeader, HeaderIconButton } from '@/components/layout/ScreenHeader';
import { AppAlert } from '../../../components/ui/AppAlert';
import EmptyState from '@/components/ui/EmptyState';
import { SgateColors, SgateFonts, SgateLayout } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { normaliseVehicleStatus } from '../../../services/vehicles.service';

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
  rejectionNote?: string;
}

function normaliseVehicle(raw: any): Vehicle {
  return {
    id: raw.id,
    vehicleNumber: raw.vehicleNumber ?? raw.number ?? '',
    vehicleType: raw.vehicleType ?? raw.type ?? 'Other',
    model: raw.model ?? '',
    color: raw.color ?? '',
    status: normaliseVehicleStatus(raw.status),
    parkingSlot: raw.parkingSlot ?? undefined,
    stickerNumber: raw.stickerNumber ?? undefined,
    lastSeen: raw.lastSeen ?? undefined,
    rejectionNote: raw.rejectionNote ?? raw.reason ?? undefined,
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
  // Only an approved vehicle gets a sticker; say what is actually holding it up.
  const sticker = vehicle.status === 'ACTIVE'
    ? { icon: stickerIssued ? 'check-circle' as const : 'clock' as const, color: stickerIssued ? SgateColors.green : SgateColors.t3, text: 'Sticker: ' + (stickerIssued ? vehicle.stickerNumber : 'Pending') }
    : vehicle.status === 'PENDING'
      ? { icon: 'clock' as const, color: SgateColors.t3, text: 'Awaiting admin approval' }
      : { icon: 'x-circle' as const, color: SgateColors.red, text: 'Not approved' };

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
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 80).springify()}>
      <TouchableOpacity style={S.card} activeOpacity={0.8}>
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
            <Feather name={sticker.icon} size={13} color={sticker.color} />
            <Text style={[S.stickerText, { color: sticker.color }]}>{sticker.text}</Text>
          </View>
        </View>

        {vehicle.status === 'REJECTED' ? (
          <View style={S.rejectNote}>
            <Feather name="info" size={13} color={SgateColors.red} />
            <Text style={S.rejectNoteText}>
              {vehicle.rejectionNote
                ? `Reason: ${vehicle.rejectionNote}`
                : 'Rejected by the society admin. Contact them, or delete and register it again with the correct details.'}
            </Text>
          </View>
        ) : null}
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
      // Keep the vehicles already on screen; a failed refetch shouldn't empty the list.
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchVehicles(); }, []));

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resident/vehicles/${id}`);
      setVehicles(vs => vs.filter(v => v.id !== id));
    } catch {
      AppAlert.show('Error', 'Could not delete vehicle. Please try again.');
    }
  };

  return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ScreenHeader
        title="My Vehicles"
        rightAction={
          <HeaderIconButton
            icon="plus"
            onPress={() => router.push('/(resident)/vehicles/add' as any)}
            accessibilityLabel="Add vehicle"
          />
        }
      />

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <AppLoader />
      ) : vehicles.length === 0 ? (
        <EmptyState
          iconName="car-outline"
          iconBg={SgateColors.goldPale}
          iconColor={SgateColors.goldDeep}
          title="No vehicles added"
          description="Add your vehicle for smoother gate entry and society sticker assignment"
          ctaLabel="Add Vehicle"
          onCtaPress={() => router.push('/(resident)/vehicles/add' as any)}
        />
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
            activeOpacity={0.8}
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



  // ── List ──────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: SgateLayout.screenGutter,
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

  rejectNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: SgateColors.redBg,
    borderWidth: 1,
    borderColor: SgateColors.redBorder,
  },
  rejectNoteText: {
    flex: 1,
    fontFamily: SgateFonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: SgateColors.t2,
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
