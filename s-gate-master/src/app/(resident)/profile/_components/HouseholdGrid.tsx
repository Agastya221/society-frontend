import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SgateColors,
  SgateFonts,
  SgateRadius,
} from "../../../../constants/Sgate-theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HouseholdGridProps {
  familyCount: number;
  firstStaffName: string | null;
  vehicleCount: number;
  errors: {
    family: string | null;
    staff: string | null;
    vehicles: string | null;
  };
  onNavigate: (
    target: "family" | "staff" | "vehicles" | "pets" | "household",
  ) => void;
  onRetry: (section: "family" | "staff" | "vehicles") => void;
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

interface TileProps {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconBg: string;
  iconColor: string;
  error: string | null;
  onPress: () => void;
  onRetry?: () => void;
}

function Tile({
  title,
  subtitle,
  iconName,
  iconBg,
  iconColor,
  error,
  onPress,
  onRetry,
}: TileProps) {
  if (error) {
    return (
      <TouchableOpacity
        style={styles.tile}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <View style={styles.tileContent}>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.tileError}>Tap to retry</Text>
        </View>
        <View style={[styles.tileIcon, { backgroundColor: SgateColors.redBg }]}>
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={SgateColors.red}
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tileContent}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
        <View style={styles.addBadge}>
          <MaterialCommunityIcons
            name="plus"
            size={12}
            color={SgateColors.card}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HouseholdGrid({
  familyCount,
  firstStaffName,
  vehicleCount,
  errors,
  onNavigate,
  onRetry,
}: HouseholdGridProps) {
  const familySub =
    familyCount > 0
      ? `${familyCount} member${familyCount !== 1 ? "s" : ""}`
      : "No members yet";

  const staffSub = firstStaffName ?? "No staff yet";

  const vehicleSub = vehicleCount > 0 ? `${vehicleCount} registered` : "+ Add";

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="home-group"
            size={18}
            color={SgateColors.t2}
          />
          <Text style={styles.headerTitle}>Household</Text>
        </View>
        <TouchableOpacity
          onPress={() => onNavigate("household")}
          activeOpacity={0.7}
        >
          <View style={styles.manageBtn}>
            <Text style={styles.manageText}>Manage</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={SgateColors.t2}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile
            title="Family"
            subtitle={familySub}
            iconName="account-group"
            iconBg={SgateColors.goldPale}
            iconColor={SgateColors.goldDeep}
            error={errors.family}
            onPress={() => onNavigate("family")}
            onRetry={() => onRetry("family")}
          />
          <Tile
            title="Daily Help"
            subtitle={staffSub}
            iconName="briefcase-account"
            iconBg={SgateColors.blueBg}
            iconColor={SgateColors.blue}
            error={errors.staff}
            onPress={() => onNavigate("staff")}
            onRetry={() => onRetry("staff")}
          />
        </View>
        <View style={styles.gridRow}>
          <Tile
            title="Vehicles"
            subtitle={vehicleSub}
            iconName="car-multiple"
            iconBg={SgateColors.greenBg}
            iconColor={SgateColors.green}
            error={errors.vehicles}
            onPress={() => onNavigate("vehicles")}
            onRetry={() => onRetry("vehicles")}
          />
          <Tile
            title="Pets"
            subtitle="+ Add"
            iconName="paw"
            iconBg="#FFF0E5"
            iconColor="#F97316"
            error={null}
            onPress={() => onNavigate("pets")}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginLeft: 8,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  manageText: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },

  // Tile
  tile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SgateColors.card,
    borderRadius: SgateRadius.sm,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tileContent: {
    flex: 1,
    marginRight: 8,
  },
  tileTitle: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  tileError: {
    fontSize: 11,
    fontFamily: SgateFonts.medium,
    color: SgateColors.red,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: SgateColors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: SgateColors.card,
  },
});
