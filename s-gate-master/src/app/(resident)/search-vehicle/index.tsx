import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_FOUND = {
  vehicleNumber: 'MH 01 AB 1234',
  owner: 'Tower B, Flat 204',
  vehicle: 'Maruti Swift - White',
  status: 'PARKED - Level B2',
  lastSeen: 'Today, 2:45 PM',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function FoundCard() {
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.resultCard, styles.foundCard]}
    >
      {/* Header row */}
      <View style={styles.foundHeader}>
        <Feather name="check-circle" size={20} color={SgateColors.green} />
        <Text style={styles.foundHeaderText}>Vehicle Found in Society</Text>
      </View>

      {/* Vehicle number */}
      <Text style={styles.vehicleNumber}>{MOCK_FOUND.vehicleNumber}</Text>

      {/* Detail rows */}
      <View style={styles.detailRows}>
        <View style={styles.detailRow}>
          <Feather name="home" size={15} color={SgateColors.t3} />
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{MOCK_FOUND.owner}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="truck" size={15} color={SgateColors.t3} />
          <Text style={styles.detailLabel}>Vehicle</Text>
          <Text style={styles.detailValue}>{MOCK_FOUND.vehicle}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="map-pin" size={15} color={SgateColors.t3} />
          <Text style={styles.detailLabel}>Status</Text>
          <View style={styles.statusRow}>
            {MOCK_FOUND.status.startsWith('PARKED') && (
              <View style={styles.greenDot} />
            )}
            <Text style={styles.detailValue}>{MOCK_FOUND.status}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Feather name="clock" size={15} color={SgateColors.t3} />
          <Text style={styles.detailLabel}>Last seen</Text>
          <Text style={styles.detailValue}>{MOCK_FOUND.lastSeen}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Alert.alert('Call', 'Calling the vehicle owner...')}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={15} color={SgateColors.green} />
          <Text style={styles.callBtnText}>Call Owner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportBtnSecondary}
          onPress={() =>
            Alert.alert('Report', 'Issue reported to the security team.')
          }
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
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.resultCard, styles.notFoundCard]}
    >
      {/* Header row */}
      <View style={styles.notFoundHeader}>
        <Feather name="x-circle" size={20} color={SgateColors.red} />
        <Text style={styles.notFoundHeaderText}>Vehicle Not Found</Text>
      </View>

      <Text style={styles.notFoundBody}>
        This vehicle number is not registered in the society directory.
      </Text>

      <TouchableOpacity
        style={styles.reportUnknownBtn}
        onPress={() =>
          Alert.alert(
            'Report Submitted',
            'The security team has been notified about this vehicle.',
          )
        }
        activeOpacity={0.8}
      >
        <Text style={styles.reportUnknownText}>Report Unknown Vehicle</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SearchVehicleScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'found' | 'not-found' | null>(null);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSearch = () => {
    const normalized = query.trim().replace(/\s+/g, '').toUpperCase();
    if (normalized.length < 4) return;
    setSearched(true);
    if (normalized === 'MH01AB1234') {
      setResult('found');
    } else {
      setResult('not-found');
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setSearched(false);
  };

  const isSearchDisabled = query.trim().length < 4;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Vehicle</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Search Card ── */}
          <View style={styles.searchCard}>
            <Text style={styles.searchCardTitle}>Find a Vehicle</Text>
            <Text style={styles.searchCardSubtitle}>
              Enter a vehicle number to check if it is registered in the
              society.
            </Text>

            {/* Input row */}
            <View
              style={[
                styles.inputRow,
                focused && styles.inputRowFocused,
              ]}
            >
              <Feather
                name="truck"
                size={18}
                color={SgateColors.t3}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="MH 01 AB 1234"
                placeholderTextColor={SgateColors.t4}
                autoCapitalize="characters"
                value={query}
                onChangeText={(t) => {
                  setQuery(t.toUpperCase());
                  setResult(null);
                  setSearched(false);
                }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={18} color={SgateColors.t3} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search button */}
            <TouchableOpacity
              style={[
                styles.searchBtn,
                isSearchDisabled && styles.searchBtnDisabled,
              ]}
              onPress={handleSearch}
              disabled={isSearchDisabled}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.searchBtnText,
                  isSearchDisabled && styles.searchBtnTextDisabled,
                ]}
              >
                Search
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Results ── */}
          {searched && result === 'found' && <FoundCard />}
          {searched && result === 'not-found' && <NotFoundCard />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
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
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },
  headerSpacer: {
    width: 22,
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  // Search card
  searchCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  searchCardTitle: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginBottom: 4,
  },
  searchCardSubtitle: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginBottom: 16,
  },
  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputRowFocused: {
    borderColor: SgateColors.gold,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    letterSpacing: 1.5,
  },
  // Search button
  searchBtn: {
    marginTop: 12,
    backgroundColor: SgateColors.black,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: SgateColors.surface,
  },
  searchBtnText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.card,
  },
  searchBtnTextDisabled: {
    color: SgateColors.t3,
  },
  // Result cards (shared)
  resultCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    marginTop: 20,
  },
  // Found card
  foundCard: {
    borderColor: SgateColors.green,
  },
  foundHeader: {
    backgroundColor: SgateColors.greenBg,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  foundHeaderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: SgateFonts.bold,
    color: SgateColors.green,
  },
  vehicleNumber: {
    fontSize: 24,
    fontFamily: SgateFonts.extrabold,
    color: SgateColors.t1,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  detailRows: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SgateColors.green,
  },
  divider: {
    height: 1,
    backgroundColor: SgateColors.borderSoft,
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: SgateColors.greenBg,
    gap: 6,
  },
  callBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.green,
  },
  reportBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: SgateColors.surface,
    gap: 6,
  },
  reportBtnSecondaryText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },
  // Not found card
  notFoundCard: {
    borderColor: SgateColors.red,
  },
  notFoundHeader: {
    backgroundColor: SgateColors.redBg,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  notFoundHeaderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: SgateFonts.bold,
    color: SgateColors.red,
  },
  notFoundBody: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  reportUnknownBtn: {
    borderWidth: 1.5,
    borderColor: SgateColors.red,
    backgroundColor: SgateColors.redBg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportUnknownText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.red,
  },
});
