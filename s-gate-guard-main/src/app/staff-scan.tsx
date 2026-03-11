import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function StaffScanScreen() {
  const [scanned, setScanned] = useState(false);
  const [staffData, setStaffData] = useState<any>(null);
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleScan = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanned(true);
    setStaffData({
      name: 'Ramesh Kumar',
      id: 'STAFF-2024-007',
      department: 'Security',
      shift: 'Day Shift',
      status: 'IN',
    });
    
    setTimeout(() => {
      setScanned(false);
      setStaffData(null);
    }, 4000);
  };

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Attendance</Text>
        <Text style={styles.headerSubtitle}>Scan staff ID card to mark IN/OUT</Text>
      </View>

      {/* Scanner Area */}
      <View style={styles.scannerContainer}>
        <Animated.View 
          style={[
            styles.scannerFrame,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          
          <Ionicons name="qr-code-outline" size={120} color="#3B82F6" style={{ opacity: 0.3 }} />
        </Animated.View>

        <Text style={styles.scanInstruction}>
          {scanned ? 'Scan Successful!' : 'Align QR Code within frame'}
        </Text>
      </View>

      {/* Staff Info Card (appears after scan) */}
      {staffData ? (
        <Animated.View style={styles.staffCard}>
          <View style={styles.staffHeader}>
            <View style={styles.staffAvatar}>
              <Ionicons name="person" size={32} color="#3B82F6" />
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staffData.name}</Text>
              <Text style={styles.staffId}>{staffData.id}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{staffData.status}</Text>
            </View>
          </View>
          
          <View style={styles.staffDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={18} color="#6B7280" />
              <Text style={styles.detailText}>{staffData.department}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={styles.detailText}>{staffData.shift}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Simulate Scan Button */}
      <Pressable
        onPress={handleScan}
        disabled={scanned}
        style={({ pressed }) => [
          styles.scanButton,
          scanned && styles.scanButtonDisabled,
          pressed && !scanned && styles.scanButtonPressed,
        ]}
      >
        <Ionicons name="scan" size={24} color={scanned ? '#9CA3AF' : '#FFFFFF'} />
        <Text style={[styles.scanButtonText, scanned && styles.scanButtonTextDisabled]}>
          {scanned ? 'Attendance Marked' : 'Simulate Scan'}
        </Text>
      </Pressable>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
        <Text style={styles.infoText}>
          In production, this will use the device camera to scan physical QR codes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  scannerContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  scannerFrame: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3B82F6',
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3B82F6',
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3B82F6',
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3B82F6',
    borderBottomRightRadius: 8,
  },
  scanInstruction: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 20,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  staffId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  staffDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  scanButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  scanButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  scanButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  scanButtonTextDisabled: {
    color: '#6B7280',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    lineHeight: 18,
  },
});
