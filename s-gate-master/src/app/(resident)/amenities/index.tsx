import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { AMENITIES, Amenity } from '../../../mocks/amenities';

function AmenityCard({ item, index }: { item: Amenity; index: number }) {
  const router = useRouter();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={S.cardWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={S.card}
        onPress={() => router.push(`/(resident)/amenities/${item.id}` as any)}
      >
        <View style={[S.iconBubble, { backgroundColor: item.colorBg }]}>
          <Feather name={item.icon as any} size={24} color={item.colorIcon} />
        </View>

        <Text style={S.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={S.cardTiming} numberOfLines={1}>
          {item.timing}
        </Text>

        <View style={S.capacityRow}>
          <Feather name="users" size={11} color={SgateColors.t4} />
          <Text style={S.capacityText}>Max {item.maxCapacity}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AmenitiesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>

        <Text style={S.headerTitle}>Amenities</Text>

        <TouchableOpacity
          onPress={() =>
            router.push('/(resident)/amenities/my-bookings' as any)
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bookmark" size={20} color={SgateColors.t1} />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <FlatList
        data={AMENITIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={S.columnWrapper}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <AmenityCard item={item} index={index} />
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Header
  header: {
    backgroundColor: SgateColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },

  // Grid
  columnWrapper: {
    paddingHorizontal: 12,
    gap: 10,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Card
  cardWrapper: {
    flex: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  iconBubble: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginTop: 10,
    marginBottom: 2,
  },
  cardTiming: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  capacityRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityText: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
});
