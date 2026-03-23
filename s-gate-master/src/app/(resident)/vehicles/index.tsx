import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { VEHICLES, Vehicle, VehicleStatus } from '../../../mocks/vehicles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusBadgeCfg = { bg: string; text: string; label: string };

function getStatusCfg(status: VehicleStatus): StatusBadgeCfg {
  switch (status) {
    case 'ACTIVE':
      return { bg: SgateColors.greenBg, text: SgateColors.green, label: 'Active' };
    case 'PENDING':
      return { bg: SgateColors.goldPale, text: SgateColors.goldDeep, label: 'Pending' };
    case 'REJECTED':
      return { bg: SgateColors.redBg, text: SgateColors.red, label: 'Rejected' };
  }
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  onDelete: (id: string) => void;
}

function VehicleCard({ vehicle, index, onDelete }: VehicleCardProps) {
  const statusCfg = getStatusCfg(vehicle.status);

  function handleMenuPress() {
    Alert.alert(
      vehicle.make + ' ' + vehicle.model,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Vehicle',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Vehicle',
              'Are you sure you want to remove this vehicle?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(vehicle.id),
                },
              ],
            );
          },
        },
      ],
    );
  }

  // Icon bubble config per type
  let iconBubbleBg: string;
  let iconName: React.ComponentProps<typeof Feather>['name'];
  let iconColor: string;

  switch (vehicle.type) {
    case 'CAR':
      iconBubbleBg = SgateColors.blueBg;
      iconName = 'truck';
      iconColor = SgateColors.blue;
      break;
    case 'BIKE':
      iconBubbleBg = SgateColors.greenBg;
      iconName = 'zap';
      iconColor = SgateColors.green;
      break;
    default:
      iconBubbleBg = SgateColors.surface;
      iconName = 'circle';
      iconColor = SgateColors.t2;
      break;
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={styles.card}>
        {/* Top row: icon + plate + menu */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeIconBubble, { backgroundColor: iconBubbleBg }]}>
            <Feather name={iconName} size={20} color={iconColor} />
          </View>

          <Text style={styles.plateNumber}>{vehicle.number}</Text>

          <TouchableOpacity
            onPress={handleMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="more-vertical" size={20} color={SgateColors.t2} />
          </TouchableOpacity>
        </View>

        {/* Make + Model */}
        <Text style={styles.makeModel}>{vehicle.make + ' ' + vehicle.model}</Text>

        {/* Detail row: colour · year */}
        <View style={styles.detailRow}>
          <Feather name="droplet" size={12} color={SgateColors.t3} />
          <Text style={styles.detailText}>{vehicle.color}</Text>
          <Text style={styles.detailSep}>{'  ·  '}</Text>
          <Text style={styles.detailYear}>{vehicle.year.toString()}</Text>
        </View>

        {/* Bottom row: status badge + sticker status */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
              {statusCfg.label}
            </Text>
          </View>

          <View style={styles.flex1} />

          <View style={styles.stickerRow}>
            <Feather
              name={vehicle.stickerIssued ? 'check-circle' : 'clock'}
              size={13}
              color={vehicle.stickerIssued ? SgateColors.green : SgateColors.t4}
            />
            <Text
              style={[
                styles.stickerText,
                { color: vehicle.stickerIssued ? SgateColors.green : SgateColors.t3 },
              ]}
            >
              {'Sticker: ' + (vehicle.stickerIssued ? 'Issued' : 'Pending')}
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
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);

  function handleDelete(id: string) {
    setVehicles(vs => vs.filter(v => v.id !== id));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Vehicles</Text>

        <TouchableOpacity
          onPress={() => router.push('/(resident)/vehicles/add' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="plus" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <Feather name="truck" size={52} color={SgateColors.t4} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No vehicles registered</Text>
          <Text style={styles.emptySubtitle}>
            Register your vehicle to get a society sticker and enable automatic gate entry
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(resident)/vehicles/add' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Vehicle list */
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.bg,
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

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: SgateColors.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontFamily: SgateFonts.bold,
    fontSize: 15,
    color: SgateColors.black,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateNumber: {
    fontFamily: SgateFonts.extrabold,
    fontSize: 20,
    color: SgateColors.t1,
    flex: 1,
    letterSpacing: 1,
  },

  // Make + Model
  makeModel: {
    fontFamily: SgateFonts.medium,
    fontSize: 14,
    color: SgateColors.t2,
    marginTop: 8,
  },

  // Detail row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  detailText: {
    fontFamily: SgateFonts.regular,
    fontSize: 13,
    color: SgateColors.t3,
  },
  detailSep: {
    fontFamily: SgateFonts.regular,
    fontSize: 13,
    color: SgateColors.t3,
  },
  detailYear: {
    fontFamily: SgateFonts.regular,
    fontSize: 13,
    color: SgateColors.t3,
  },

  // Bottom row
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: SgateFonts.bold,
    fontSize: 11,
  },
  flex1: {
    flex: 1,
  },
  stickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stickerText: {
    fontFamily: SgateFonts.medium,
    fontSize: 12,
  },
});
