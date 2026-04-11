import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

const TYPE_ICONS: Record<string, string> = {
  MEDICAL: 'medkit',
  FIRE: 'flame',
  SECURITY: 'shield-half',
  LIFT_STUCK: 'arrow-up-circle-outline',
  ANIMAL_THREAT: 'paw',
  THEFT: 'bag-remove-outline',
  VIOLENCE: 'person-remove-outline',
  ACCIDENT: 'car-outline',
  OTHER: 'ellipsis-horizontal',
};

const TYPE_LABELS: Record<string, string> = {
  MEDICAL: 'Medical',
  FIRE: 'Fire',
  SECURITY: 'Security',
  LIFT_STUCK: 'Lift Stuck',
  ANIMAL_THREAT: 'Animal Threat',
  THEFT: 'Theft',
  VIOLENCE: 'Violence',
  ACCIDENT: 'Accident',
  OTHER: 'Other',
};

interface Emergency {
  id: string;
  type: string;
  status: string;
  description?: string;
  location?: string;
  createdAt: string;
  resolvedAt?: string;
  respondedBy: { id: string; name: string } | null;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'TRIGGERED':
    case 'ACKNOWLEDGED':
      return {
        bg: 'bg-red-500',
        text: 'text-white',
        label: 'Active',
        iconBg: 'bg-red-50',
        iconColor: '#ef4444',
      };
    case 'RESOLVED':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Resolved',
        iconBg: 'bg-emerald-50',
        iconColor: '#10b981',
      };
    case 'FALSE_ALARM':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        label: 'Cancelled',
        iconBg: 'bg-gray-100',
        iconColor: '#6b7280',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        label: status,
        iconBg: 'bg-gray-100',
        iconColor: '#6b7280',
      };
  }
}

export default function EmergencyListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleError = (err: any) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message;

    if (status === 401) {
      router.replace('/login' as any);
      return;
    }
    if (status === 403) {
      AppAlert.show('Error', 'Your account is inactive. Contact your admin.');
      return;
    }
    if (status === 500) {
      AppAlert.show('Error', 'SOS failed — please call security directly');
      return;
    }
    if (!err?.response) {
      AppAlert.show('Error', 'No connection. Please try again.');
      return;
    }
    AppAlert.show('Error', message || 'Something went wrong, please try again');
  };

  const fetchEmergencies = useCallback(async () => {
    try {
      const res = await api.get('/community/emergencies/my');
      const list = res.data?.data?.emergencies || [];
      setEmergencies(list);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEmergencies();
    }, [fetchEmergencies])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchEmergencies();
  };

  const renderItem = ({ item, index }: { item: Emergency; index: number }) => {
    const statusInfo = getStatusStyle(item.status);
    const iconName = TYPE_ICONS[item.type] || 'ellipsis-horizontal';
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
        <TouchableOpacity
          className="bg-white border border-gray-100 p-4 rounded-2xl mb-3 flex-row items-center shadow-sm"
          onPress={() => router.push(`/(resident)/emergency/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <View className={`w-12 h-12 rounded-full items-center justify-center ${statusInfo.iconBg}`}>
            <Ionicons name={iconName as any} size={22} color={statusInfo.iconColor} />
          </View>

          <View className="flex-1 ml-3">
            <Text className="text-[15px] font-bold text-gray-900">{typeLabel}</Text>
            <Text className="text-xs font-medium text-gray-400 mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {item.respondedBy && (
              <Text className="text-[11px] font-medium text-emerald-600 mt-1">
                Responded by {item.respondedBy.name}
              </Text>
            )}
          </View>

          <View className="items-end pl-2">
            <View className={`px-2.5 py-1 rounded-full ${statusInfo.bg}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${statusInfo.text}`}>
                {statusInfo.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} className="text-gray-400 mt-2" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View className="bg-red-500 rounded-2xl p-5 mb-5 flex-row items-center overflow-hidden">
      {/* Background decoration */}
      <View className="absolute -right-6 -bottom-6 opacity-20">
        <Ionicons name="warning" size={120} color="#FFFFFF" />
      </View>

      <View className="flex-1 z-10">
        <Text className="text-[17px] font-bold text-white tracking-wide">Emergency Assistance</Text>
        <Text className="text-sm font-medium text-red-100 mt-1 mb-4">
          Tap below to instantly alert guards and send an SOS beacon.
        </Text>
        <TouchableOpacity
          className="bg-white rounded-xl px-5 py-2.5 self-start shadow-sm flex-row items-center"
          onPress={() => router.push('/(resident)/emergency/create' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={18} color="#ef4444" className="mr-2" />
          <Text className="text-[13px] font-bold text-red-600">Raise SOS Alert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-20 opacity-70">
      <Ionicons name="shield-checkmark-outline" size={64} className="text-gray-300 mb-4" />
      <Text className="text-lg font-bold text-gray-700">No Emergencies</Text>
      <Text className="text-gray-500 text-sm mt-1 text-center px-10 leading-5">
        Your SOS and security alert history will appear here.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Standard Header matching Family screen */}
      <View 
        className="px-5 flex-row items-center justify-between bg-white border-b border-gray-100"
        style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="arrow-back" size={24} className="text-gray-700" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">My Emergencies</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/(resident)/emergency/create' as any)} 
          className="h-10 w-10 items-center justify-center rounded-full bg-red-100"
        >
          <Ionicons name="warning" size={20} className="text-red-500" />
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={emergencies}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#ef4444"
              colors={['#ef4444']}
            />
          }
        />
      )}
    </View>
  );
}
