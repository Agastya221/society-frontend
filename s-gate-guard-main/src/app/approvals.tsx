import { getGatePasses } from '@/data/mockGatePasses';
import { GatePass } from '@/types/gatePass';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';

const TYPE_COLORS = {
  Guest: '#3B82F6',
  Delivery: '#F59E0B',
  Worker: '#8B5CF6',
  Cab: '#10B981',
};

const STATUS_CONFIG = {
  Pending: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#D97706',
    icon: 'time' as const,
    iconColor: '#F59E0B',
  },
  Approved: {
    bg: '#D1FAE5',
    border: '#A7F3D0',
    text: '#047857',
    icon: 'checkmark-circle' as const,
    iconColor: '#10B981',
  },
  Rejected: {
    bg: '#FEE2E2',
    border: '#FECACA',
    text: '#B91C1C',
    icon: 'close-circle' as const,
    iconColor: '#EF4444',
  },
};

export default function ApprovalsScreen() {
  const [passes, setPasses] = useState<GatePass[]>([]);

  useEffect(() => {
    const allPasses = getGatePasses().filter(p => p.source === 'GUARD');
    setPasses(allPasses);
  }, []);

  const renderItem = ({ item, index }: { item: GatePass; index: number }) => {
    const color = TYPE_COLORS[item.type];
    const statusConfig = STATUS_CONFIG[item.status];
    
    return (
      <AnimatedCard index={index} color={color}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
              <Ionicons 
                name={item.type === 'Guest' ? 'person' : 
                      item.type === 'Delivery' ? 'cube' :
                      item.type === 'Worker' ? 'construct' : 'car'} 
                size={20} 
                color={color} 
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.visitorName}>{item.title}</Text>
              <Text style={styles.visitorDetails}>
                {item.type} • Flat {item.flatNumber}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }
          ]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.iconColor} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.timestamp}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timestampText}>
              {new Date(item.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {item.status === 'Rejected' && item.rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        ) : null}
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      {passes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Requests Found</Text>
          <Text style={styles.emptySubtitle}>
            Your submitted requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={passes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function AnimatedCard({ 
  children, 
  index, 
  color 
}: { 
  children: React.ReactNode; 
  index: number; 
  color: string;
}) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 80,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 80,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderLeftColor: color,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  visitorDetails: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  rejectionBanner: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
