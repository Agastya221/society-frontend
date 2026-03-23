import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';
import { AMENITIES } from '../../../../mocks/amenities';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

function formatReadableDate(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export default function BookAmenityScreen() {
  const router = useRouter();
  const { id, slotId: _slotId, slotTime, date } = useLocalSearchParams<{
    id: string;
    slotId: string;
    slotTime: string;
    date: string;
  }>();

  const [members, setMembers] = useState(1);
  const [showRules, setShowRules] = useState(false);

  const amenity = AMENITIES.find((a) => a.id === id);

  if (!amenity) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={S.root}>
        <View style={S.notFound}>
          <Text style={S.notFoundText}>Not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const readableDate = date ? formatReadableDate(date) : '';

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Booking',
      `Book ${amenity.name} on ${readableDate} at ${slotTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert(
              'Booking Confirmed!',
              'Your slot has been booked. Check My Bookings for details.',
              [
                {
                  text: 'OK',
                  onPress: () =>
                    router.push('/(resident)/amenities' as any),
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Confirm Booking</Text>
        <View style={S.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scrollContent}
      >
        {/* Summary card */}
        <View style={S.summaryCard}>
          <Text style={S.summaryCardLabel}>Booking Summary</Text>

          {/* Amenity row */}
          <View style={S.amenityRow}>
            <View
              style={[S.amenityIconBubble, { backgroundColor: amenity.colorBg }]}
            >
              <Feather
                name={amenity.icon as any}
                size={22}
                color={amenity.colorIcon}
              />
            </View>
            <Text style={S.amenityName}>{amenity.name}</Text>
          </View>

          {/* Detail rows */}
          <View style={S.detailRow}>
            <Feather name="calendar" size={14} color={SgateColors.t3} />
            <Text style={S.detailLabel}>Date</Text>
            <Text style={S.detailValue}>{readableDate}</Text>
          </View>

          <View style={[S.detailRow, { marginTop: 8 }]}>
            <Feather name="clock" size={14} color={SgateColors.t3} />
            <Text style={S.detailLabel}>Time</Text>
            <Text style={S.detailValue}>{slotTime}</Text>
          </View>

          <View style={[S.detailRow, { marginTop: 8 }]}>
            <Feather name="home" size={14} color={SgateColors.t3} />
            <Text style={S.detailLabel}>Flat</Text>
            <Text style={S.detailValue}>B-204</Text>
          </View>

          <View style={S.divider} />

          {/* Members stepper */}
          <View style={S.stepperRow}>
            <Text style={S.stepperLabel}>Members</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMembers((m) => Math.max(1, m - 1))}
            >
              <View style={S.stepperBtn}>
                <Feather name="minus" size={16} color={SgateColors.t2} />
              </View>
            </TouchableOpacity>

            <Text style={S.stepperCount}>{members}</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                setMembers((m) => Math.min(amenity.maxCapacity, m + 1))
              }
            >
              <View style={[S.stepperBtn, S.stepperBtnPlus]}>
                <Feather name="plus" size={16} color={SgateColors.black} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rules card */}
        <View style={S.rulesCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={S.rulesToggleRow}
            onPress={() => setShowRules((v) => !v)}
          >
            <Text style={S.rulesToggleLabel}>Rules & Guidelines</Text>
            <View style={{ flex: 1 }} />
            <Feather
              name={showRules ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={SgateColors.t2}
            />
          </TouchableOpacity>

          {showRules &&
            amenity.rules.map((rule, idx) => (
              <View key={idx} style={S.ruleRow}>
                <View style={S.ruleDot} />
                <Text style={S.ruleText}>{rule}</Text>
              </View>
            ))}
        </View>

        {/* Note card */}
        <View style={S.noteCard}>
          <Feather name="info" size={16} color={SgateColors.goldDeep} />
          <Text style={S.noteText}>
            Cancellations must be made at least 2 hours before the slot.
          </Text>
        </View>

        {/* Confirm button */}
        <View style={S.buttonContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={S.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={S.confirmButtonText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Header
  header: {
    backgroundColor: SgateColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },
  headerSpacer: {
    width: 22,
  },

  // Summary card
  summaryCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  summaryCardLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
    marginBottom: 12,
  },

  // Amenity row
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  amenityIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityName: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  divider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: SgateColors.borderSoft,
  },

  // Members stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: SgateColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: SgateColors.gold,
  },
  stepperCount: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    width: 36,
    textAlign: 'center',
  },

  // Rules card
  rulesCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  rulesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rulesToggleLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  ruleRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SgateColors.goldDeep,
    marginTop: 6,
  },
  ruleText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    flex: 1,
  },

  // Note card
  noteCard: {
    backgroundColor: SgateColors.goldPale,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.goldDeep,
    flex: 1,
  },

  // Confirm button
  buttonContainer: {
    marginTop: 24,
  },
  confirmButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: SgateColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },
});
