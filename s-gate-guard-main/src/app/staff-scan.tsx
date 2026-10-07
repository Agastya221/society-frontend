import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const cleanStaffType = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function StaffScanScreen() {
    const router = useRouter();
    const [staffIdInput, setStaffIdInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [staffData, setStaffData] = useState<any>(null);
    const busyRef = useRef(false);

    const handleCheckIn = async () => {
        if (!staffIdInput.trim() || busyRef.current) return;
        busyRef.current = true; // a double tap would toggle check-in straight back to check-out
        setScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // The pass code is the staff member's QR token, so a typed code goes through the
            // same /guard/scan endpoint as the camera (toggles check-in / check-out).
            // /staff/domestic/check-in expects domesticStaffId + societyId and 500s on { staffId }.
            const code = staffIdInput.trim().toUpperCase();
            const res = await api.post('/api/v1/guard/scan', { qrToken: code });
            const scan = res.data?.data;
            const pass = scan?.pass ?? {};
            if (scan?.type !== 'DOMESTIC_STAFF') {
                throw new Error('This code is not a staff pass. Use Scan pass for visitor QR codes.');
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const checkedOut = pass.attendanceAction === 'CHECKED_OUT';
            const at = checkedOut ? pass.checkOutTime : pass.checkInTime;
            setStaffData({
                name: pass.name ?? 'Staff member',
                id: code,
                department: pass.staffType ? cleanStaffType(pass.staffType) : 'Domestic Staff',
                actionLabel: checkedOut ? 'Checked-out' : 'Checked-in',
                shift: at ? new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
                status: checkedOut ? 'CHECKED OUT' : 'CHECKED IN',
            });
            setStaffIdInput(''); // Clear input after a successful scan

        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Check-In Failed',
                err?.response?.data?.message || err?.message || 'Could not verify staff check-in'
            );
        } finally {
            busyRef.current = false;
            setScanning(false);
        }
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.eyebrow}>STAFF ACCESS</Text>
                <Text style={styles.headerTitle}>Mark attendance</Text>
                <Text style={styles.headerSubtitle}>Scan the helper pass or type the code shown under it.</Text>
            </View>

            {/* QR Scan shortcut */}
            <Pressable style={styles.qrShortcut} onPress={() => router.push('/scan-verify' as any)}>
                <View style={styles.qrShortcutIcon}>
                    <Ionicons name="qr-code-outline" size={22} color={GuardColors.black} />
                </View>
                <View style={styles.qrShortcutText}>
                    <Text style={styles.qrShortcutTitle}>Scan staff pass</Text>
                    <Text style={styles.qrShortcutSub}>Fastest way to verify and check in</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={GuardColors.black} />
            </Pressable>

            {/* Manual Entry Form */}
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PASS CODE</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Code shown under the staff QR"
                    placeholderTextColor="#9CA3AF"
                    value={staffIdInput}
                    onChangeText={(t) => { setStaffIdInput(t); setStaffData(null); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />
                
                <Pressable
                    onPress={handleCheckIn}
                    disabled={!staffIdInput.trim() || scanning}
                    style={[
                        styles.checkInButton,
                        (!staffIdInput.trim() || scanning) && styles.checkInButtonDisabled,
                    ]}
                >
                    {scanning ? (
                        <ActivityIndicator size="small" color={GuardColors.t3} />
                    ) : (
                        <Ionicons name="checkmark-done" size={21} color={staffIdInput.trim() ? GuardColors.black : '#9CA3AF'} />
                    )}
                    <Text style={[styles.scanButtonText, (!staffIdInput.trim() || scanning) && styles.scanButtonTextDisabled]}>
                        {scanning ? 'Verifying...' : 'Check In / Out'}
                    </Text>
                </Pressable>
            </View>

            {/* Staff Info Card (appears after scan) */}
            {staffData ? (
                <View style={styles.staffCard}>
                    <View style={styles.staffHeader}>
                        <View style={styles.staffAvatar}>
                            <Ionicons name="person" size={32} color={GuardColors.goldDeep} />
                        </View>
                        <View style={styles.staffInfo}>
                            <Text style={styles.staffName}>{staffData.name}</Text>
                            <Text style={styles.staffId}>Pass {staffData.id}</Text>
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
                            <Text style={styles.detailText}>{staffData.actionLabel} at {staffData.shift}</Text>
                        </View>
                    </View>
                </View>
            ) : null}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GuardColors.bg,
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    eyebrow: { fontSize: 10, fontWeight: '900', color: GuardColors.goldDeep, letterSpacing: 1.5, marginBottom: 7 },
    headerTitle: {
        fontSize: 27,
        fontWeight: '900',
        color: GuardColors.t1,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        color: GuardColors.t2,
    },
    qrShortcut: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: GuardColors.goldPale,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ECD587',
    },
    qrShortcutIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: GuardColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrShortcutText: {
        flex: 1,
    },
    qrShortcutTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: GuardColors.t1,
        marginBottom: 2,
    },
    qrShortcutSub: {
        fontSize: 12,
        fontWeight: '500',
        color: GuardColors.t2,
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: GuardColors.border,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: GuardColors.t3,
        letterSpacing: 1.1,
        marginBottom: 8,
    },
    input: {
        backgroundColor: GuardColors.bg,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1.5,
        borderColor: GuardColors.border,
        fontWeight: '500',
        marginBottom: 16,
    },
    checkInButton: {
        backgroundColor: GuardColors.gold,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    checkInButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    checkInButtonPressed: {
        transform: [{ scale: 0.98 }],
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: GuardColors.black,
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
        borderColor: GuardColors.border,
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
        backgroundColor: GuardColors.goldPale,
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
