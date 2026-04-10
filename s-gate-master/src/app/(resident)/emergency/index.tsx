import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

const TYPE_ICONS: Record<string, string> = {
  MEDICAL: 'medkit',
  FIRE: 'flame',
  SECURITY: 'shield',
  LIFT_STUCK: 'git-merge-outline',
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
        bg: SgateColors.redBg,
        text: SgateColors.red,
        label: 'Active',
        iconBg: SgateColors.red,
        iconColor: '#FFFFFF',
      };
    case 'RESOLVED':
      return {
        bg: SgateColors.greenBg,
        text: SgateColors.green,
        label: 'Resolved',
        iconBg: SgateColors.greenBg,
        iconColor: SgateColors.green,
      };
    case 'FALSE_ALARM':
      return {
        bg: SgateColors.surface,
        text: SgateColors.t3,
        label: 'Cancelled',
        iconBg: SgateColors.surface,
        iconColor: SgateColors.t3,
      };
    default:
      return {
        bg: SgateColors.surface,
        text: SgateColors.t3,
        label: status,
        iconBg: SgateColors.surface,
        iconColor: SgateColors.t3,
      };
  }
}

export default function EmergencyListScreen() {
  const router = useRouter();
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

  const renderItem = ({ item }: { item: Emergency }) => {
    const statusInfo = getStatusStyle(item.status);
    const iconName = TYPE_ICONS[item.type] || 'ellipsis-horizontal';
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/(resident)/emergency/${item.id}` as any)
        }
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.cardIconCircle,
            { backgroundColor: statusInfo.iconBg },
          ]}
        >
          <Ionicons
            name={iconName as any}
            size={22}
            color={statusInfo.iconColor}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardType}>{typeLabel}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          {item.respondedBy && (
            <Text style={styles.cardResponder}>
              Responded by {item.respondedBy.name}
            </Text>
          )}
        </View>

        <View style={styles.cardRight}>
          <View
            style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}
          >
            <Text style={[styles.statusPillText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={SgateColors.t4}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>Need Urgent Help?</Text>
          <Text style={styles.bannerSubtitle}>
            Tap below — guards notified instantly
          </Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() =>
              router.push('/(resident)/emergency/create' as any)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.bannerButtonText}>Raise Emergency</Text>
          </TouchableOpacity>
        </View>
        <Ionicons
          name="megaphone"
          size={36}
          color="#FFFFFF"
          style={styles.bannerIcon}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="checkmark-circle-outline"
        size={56}
        color={SgateColors.t4}
      />
      <Text style={styles.emptyTitle}>No Emergencies</Text>
      <Text style={styles.emptySubtitle}>
        All your SOS history will appear here
      </Text>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={SgateColors.red} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Emergencies</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() =>
            router.push('/(resident)/emergency/create' as any)
          }
          activeOpacity={0.7}
        >
          <Ionicons name="warning" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={emergencies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={SgateColors.red}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: SgateColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SgateColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  headerRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SgateColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
  },
  banner: {
    backgroundColor: SgateColors.red,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.extrabold,
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: SgateColors.gold,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  bannerButtonText: {
    fontSize: 13,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },
  bannerIcon: {
    opacity: 0.8,
  },
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardType: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 2,
  },
  cardResponder: {
    fontSize: 11,
    fontFamily: SgateFonts.medium,
    color: SgateColors.green,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
  },
  chevron: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 4,
  },
});
