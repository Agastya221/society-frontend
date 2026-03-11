import { VisitEntry, calculateDuration, formatDuration, formatTime } from '@/types/visitEntry';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Animated,
    FlatList,
    Platform,
    Pressable,
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

// Mock initial data - approved entries ready for check-in
const INITIAL_ENTRIES: VisitEntry[] = [
  {
    id: '1',
    visitorName: 'John Doe',
    flatNumber: '101',
    purpose: 'Guest Visit',
    checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    checkOutTime: null,
    status: 'IN',
    type: 'Guest',
    approvedBy: 'Amit Sharma (101)',
  },
  {
    id: '2',
    visitorName: 'Amazon Delivery',
    flatNumber: '402',
    purpose: 'Package Delivery',
    checkInTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    checkOutTime: null,
    status: 'IN',
    type: 'Delivery',
    approvedBy: 'Priya Verma (402)',
  },
  {
    id: '3',
    visitorName: 'Plumber Service',
    flatNumber: '205',
    purpose: 'Maintenance Work',
    checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    status: 'OUT',
    type: 'Worker',
    approvedBy: 'Rajesh Kumar (205)',
  },
];

export default function TodayEntriesScreen() {
  const [entries, setEntries] = useState<VisitEntry[]>(INITIAL_ENTRIES);

  const handleCheckOut = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === id
          ? { ...entry, checkOutTime: new Date().toISOString(), status: 'OUT' as const }
          : entry
      )
    );
  };

  const renderItem = ({ item, index }: { item: VisitEntry; index: number }) => {
    return <EntryCard entry={item} index={index} onCheckOut={handleCheckOut} />;
  };

  return (
    <View style={styles.container}>
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Entries Today</Text>
          <Text style={styles.emptySubtitle}>
            Approved visitors will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function EntryCard({ 
  entry, 
  index, 
  onCheckOut 
}: { 
  entry: VisitEntry; 
  index: number; 
  onCheckOut: (id: string) => void;
}) {
  const color = TYPE_COLORS[entry.type];
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
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

  const duration = entry.checkOutTime 
    ? calculateDuration(entry.checkInTime, entry.checkOutTime)
    : null;

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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
            <Ionicons 
              name={entry.type === 'Guest' ? 'person' : 
                    entry.type === 'Delivery' ? 'cube' :
                    entry.type === 'Worker' ? 'construct' : 'car'} 
              size={20} 
              color={color} 
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.visitorName}>{entry.visitorName}</Text>
            <Text style={styles.visitorDetails}>
              Flat {entry.flatNumber} • {entry.purpose}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.statusBadge,
          entry.status === 'IN' 
            ? { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }
            : { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: entry.status === 'IN' ? '#10B981' : '#6B7280' }
          ]} />
          <Text style={[
            styles.statusText,
            { color: entry.status === 'IN' ? '#047857' : '#374151' }
          ]}>
            {entry.status}
          </Text>
        </View>
      </View>

      {/* Time Info */}
      <View style={styles.timeSection}>
        <View style={styles.timeRow}>
          <Ionicons name="enter-outline" size={16} color="#10B981" />
          <Text style={styles.timeLabel}>Check-In:</Text>
          <Text style={styles.timeValue}>{formatTime(entry.checkInTime)}</Text>
        </View>

        <View style={styles.timeRow}>
          <Ionicons name="exit-outline" size={16} color="#6B7280" />
          <Text style={styles.timeLabel}>Check-Out:</Text>
          <Text style={styles.timeValue}>
            {entry.checkOutTime ? formatTime(entry.checkOutTime) : '—'}
          </Text>
        </View>

        {duration !== null ? (
          <View style={styles.durationBanner}>
            <Ionicons name="time-outline" size={16} color="#3B82F6" />
            <Text style={styles.durationText}>
              Duration: <Text style={styles.durationValue}>{formatDuration(duration)}</Text>
            </Text>
          </View>
        ) : null}
      </View>

      {/* Approved By */}
      <View style={styles.approvedSection}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
        <Text style={styles.approvedLabel}>Approved by:</Text>
        <Text style={styles.approvedValue}>{entry.approvedBy}</Text>
      </View>

      {/* Action Button */}
      {entry.status === 'IN' ? (
        <Pressable
          onPress={() => onCheckOut(entry.id)}
          style={({ pressed }) => [
            styles.checkOutButton,
            pressed && styles.checkOutButtonPressed,
          ]}
        >
          <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
          <Text style={styles.checkOutButtonText}>Check Out</Text>
        </Pressable>
      ) : null}
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
    marginBottom: 16,
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 90,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  durationBanner: {
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  durationValue: {
    fontWeight: '900',
    color: '#1D4ED8',
  },
  approvedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 6,
  },
  approvedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  approvedValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    flex: 1,
  },
  checkOutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  checkOutButtonPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.97 }],
  },
  checkOutButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
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
