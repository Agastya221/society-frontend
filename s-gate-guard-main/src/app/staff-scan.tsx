import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function StaffScanScreen() {
    const [staffIdInput, setStaffIdInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [staffData, setStaffData] = useState<any>(null);

    const handleCheckIn = async () => {
        if (!staffIdInput.trim() || scanning) return;
        setScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await api.post('/api/v1/staff/domestic/check-in', {
                staffId: staffIdInput.trim()
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            const attendance = res.data?.data;
            if (attendance) {
                setStaffData({
                    name: attendance.staffName,
                    id: attendance.attendanceId || staffIdInput.trim(),
                    department: 'Domestic Staff',
                    shift: new Date(attendance.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    status: attendance.status,
                });
            }
            setScanned(true);
            setStaffIdInput(''); // Clear input after successful check-in

        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Check-In Failed',
                err?.response?.data?.message || err?.message || 'Could not verify staff check-in'
            );
        } finally {
            setScanning(false);
        }
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Staff Attendance</Text>
                <Text style={styles.headerSubtitle}>Manually verify staff ID card to mark IN/OUT</Text>
            </View>

            {/* Manual Entry Form */}
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter Staff ID *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. uuid-of-staff"
                    placeholderTextColor="#9CA3AF"
                    value={staffIdInput}
                    onChangeText={(t) => { setStaffIdInput(t); setScanned(false); setStaffData(null); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />
                
                <Pressable
                    onPress={handleCheckIn}
                    disabled={!staffIdInput.trim() || scanning}
                    style={({ pressed }) => [
                        styles.checkInButton,
                        (!staffIdInput.trim() || scanning) && styles.checkInButtonDisabled,
                        pressed && !!staffIdInput.trim() && !scanning && styles.checkInButtonPressed,
                    ]}
                >
                    {scanning ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                    )}
                    <Text style={[styles.scanButtonText, (!staffIdInput.trim() || scanning) && styles.scanButtonTextDisabled]}>
                        {scanning ? 'Verifying...' : 'Check In Staff'}
                    </Text>
                </Pressable>
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
                            <Text style={styles.staffId}>ID: {staffData.id.slice(0, 8)}...</Text>
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
                            <Text style={styles.detailText}>Checked-in at {staffData.shift}</Text>
                        </View>
                    </View>
                </Animated.View>
            ) : null}

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
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Platform.select({
            ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16 },
            android: { elevation: 3 },
        }),
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        fontWeight: '500',
        marginBottom: 16,
    },
    checkInButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...Platform.select({
            ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
            android: { elevation: 4 },
        }),
    },
    checkInButtonDisabled: {
        backgroundColor: '#E5E7EB',
        ...Platform.select({
            ios: { shadowOpacity: 0 },
            android: { elevation: 0 },
        }),
    },
    checkInButtonPressed: {
        transform: [{ scale: 0.98 }],
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    scanButtonTextDisabled: {
        color: '#9CA3AF',
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
        fontWeight: '700',
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
});
