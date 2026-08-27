import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

const CARD_H = 104;

const C = SgateColors;
const F = SgateFonts;

interface DailyHelpType {
  type: string;
  label: string;
  count: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

// Maps backend staffType → MaterialCommunityIcons
const TYPE_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  MAID: 'home', COOK: 'chef-hat', DRIVER: 'car', MILKMAN: 'bottle-wine',
  PAPERBOY: 'newspaper', CAR_CLEANER: 'car-wash', NANNY: 'baby-carriage',
  TUITION_TEACHER: 'book-open-page-variant', SKATING_INSTRUCTOR: 'skate',
  ELDERLY_CARETAKER: 'human-cane', LAUNDRY: 'tshirt-crew',
  CLEANER: 'broom', GARDENER: 'leaf'
};

const TYPE_LABEL_MAP: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', DRIVER: 'Driver', MILKMAN: 'Milkman',
  PAPERBOY: 'Paperboy', CAR_CLEANER: 'Car Cleaner', NANNY: 'Nanny',
  TUITION_TEACHER: 'Tuition', SKATING_INSTRUCTOR: 'Skating',
  ELDERLY_CARETAKER: 'Caretaker', LAUNDRY: 'Laundry',
  CLEANER: 'Cleaner', GARDENER: 'Gardener'
};

export default function DailyHelpIndex() {
  const router = useRouter();
  const [types, setTypes] = useState<DailyHelpType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/resident/daily-help/types');
      const rawTypes: any[] = res.data?.data ?? res.data ?? [];
      setTypes((Array.isArray(rawTypes) ? rawTypes : []).map((item: any) => ({
        type:  item.type ?? item.staffType ?? '',
        label: item.label ?? TYPE_LABEL_MAP[item.type ?? item.staffType] ?? item.type ?? '',
        count: item.count ?? 0,
        icon:  (TYPE_ICON_MAP[item.type ?? item.staffType] ?? 'account-group') as any,
      })));
    } catch (err) {
      console.error('Failed to fetch daily help types:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const navigateType = (type: string) => router.push({ pathname: '/(resident)/daily-help/[type]' as any, params: { type } });

  if (loading) {
    return (
      <View style={s.safe}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={C.t1} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Daily Help</Text>
          </View>
        </SafeAreaView>
        <AppLoader />
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Daily Help</Text>
        </View>
      </SafeAreaView>
      
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>All Daily Helps</Text>
        <View style={s.gridContainer}>
          {types.map(item => (
            <TouchableOpacity key={item.type} style={s.gridItem} activeOpacity={0.7} onPress={() => navigateType(item.type)}>
              <View style={s.gridIconCircle}>
                <MaterialCommunityIcons name={item.icon} size={28} color={C.goldDeep} />
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>


      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: F.semibold, color: C.t1, marginLeft: 12, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  
  sectionTitle: { fontSize: 12, fontFamily: F.bold, color: C.t3, letterSpacing: 1, marginBottom: 16, marginTop: 8 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '2%' as any, rowGap: 12 },
  gridItem: {
    width: '32%' as any,
    height: CARD_H,
    backgroundColor: C.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  gridIconCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridLabel: { fontSize: 11, lineHeight: 15, fontFamily: F.semibold, color: C.t1, textAlign: 'center' },


});
