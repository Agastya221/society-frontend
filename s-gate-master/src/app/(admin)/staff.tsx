import { AppLoader } from '@/components/ui/AppLoader';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { getStaffAttendance, getStaffList, StaffAttendance, StaffMember } from '@/services/staffService';

// Helpers
const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function StaffManagementScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE'>('DIRECTORY');
    const [searchQuery, setSearchQuery] = useState('');
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [staffRes, attRes] = await Promise.all([
            getStaffList(),
            getStaffAttendance(new Date().toISOString().split('T')[0]),
        ]);
        setStaff(staffRes);
        setAttendance(attRes);
        setLoading(false);
    };

    const renderStaffCard = ({ item, index }: { item: StaffMember; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity style={styles.card} activeOpacity={0.97}>
                <View style={styles.cardHeader}>
                    <Avatar name={item.name} size={46} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.staffName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.roleWrap}>
                            <Text style={styles.staffRole}>{item.role}</Text>
                            {item.phone && (
                                <>
                                    <View style={styles.roleDot} />
                                    <Text style={styles.staffPhone}>{item.phone}</Text>
                                </>
                            )}
                        </View>
                        {item.agencyName && (
                            <Text style={styles.agencyText} numberOfLines={1}>
                                Agency: {item.agencyName}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>
                            {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardMetrics}>
                    <View style={styles.metric}>
                        <Feather name="clock" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.shiftStart ? `${item.shiftStart} – ${item.shiftEnd}` : 'No shift'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Feather name="briefcase" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.salary ? `₹${item.salary.toLocaleString()}/mo` : 'Not set'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Feather name="home" size={13} color={SgateColors.t3} />
                        <Text style={styles.metricText}>
                            {item.assignedFlats?.length > 1 ? `${item.assignedFlats.length} Flats` : (item.assignedFlats?.[0] || 'Not assigned')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderAttendanceCard = ({ item, index }: { item: StaffMember; index: number }) => {
        const record = attendance.find(a => a.staffId === item.id);
        const statusColor = record?.status === 'PRESENT' ? SgateColors.green : record?.status === 'HALF_DAY' ? SgateColors.goldDeep : SgateColors.red;
        const statusBg = record?.status === 'PRESENT' ? SgateColors.greenBg : record?.status === 'HALF_DAY' ? SgateColors.goldPale : SgateColors.redBg;

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Avatar name={item.name} size={42} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.staffName}>{item.name}</Text>
                            <Text style={styles.staffRole}>{item.role}</Text>
                        </View>
                        {record ? (
                            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>{record.status.replace('_', ' ')}</Text>
                            </View>
                        ) : (
                            <View style={[styles.statusBadge, { backgroundColor: SgateColors.surface }]}>
                                <Text style={[styles.statusText, { color: SgateColors.t2 }]}>ABSENT YET</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.attTimes}>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>CHECK IN</Text>
                            <Text style={[styles.timeValue, !record?.checkInTime && { color: SgateColors.t3 }]}>
                                {formatTime(record?.checkInTime)}
                            </Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>CHECK OUT</Text>
                            <Text style={[styles.timeValue, !record?.checkOutTime && { color: SgateColors.t3 }]}>
                                {formatTime(record?.checkOutTime)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const filteredStaff = staff.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || 
               s.role.toLowerCase().includes(q) || 
               (s.phone && s.phone.includes(q));
    });

    return (
        <View style={styles.safe}>
            {/* Header + Tabs (single block, no gap) */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Staff & Payroll</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                        <Feather name="plus" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Premium underline tabs */}
                <View style={styles.tabsWrap}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'DIRECTORY' && styles.tabActive]}
                        onPress={() => { Haptics.selectionAsync(); setActiveTab('DIRECTORY'); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'DIRECTORY' && styles.tabTextActive]}>Directory</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'ATTENDANCE' && styles.tabActive]}
                        onPress={() => { Haptics.selectionAsync(); setActiveTab('ATTENDANCE'); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'ATTENDANCE' && styles.tabTextActive]}>Today's Logs</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Spacer — breathing room below fixed header+tabs */}
            <View style={styles.spacer} />

            {/* Content */}
            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filteredStaff}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={activeTab === 'DIRECTORY' ? renderStaffCard : renderAttendanceCard}
                    ListHeaderComponent={
                        <View style={styles.searchWrap}>
                            <Feather name="search" size={18} color={SgateColors.t3} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name, role, or phone..."
                                placeholderTextColor={SgateColors.t4}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Feather name="x-circle" size={16} color={SgateColors.t4} />
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-group-outline" size={40} color={SgateColors.t4} />
                            <Text style={styles.emptyText}>No staff records found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    // Header wrapper (contains header row + tabs as one block)
    headerWrapper: {
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
    spacer: { height: 6, backgroundColor: SgateColors.bg },

    // Premium underline tabs
    tabsWrap: {
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: SgateColors.gold },
    tabText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    tabTextActive: { fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    list: { padding: 20, paddingBottom: 100 },
    
    // Search Box
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardInfo: { flex: 1 },
    staffName: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    roleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    staffRole: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    roleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: SgateColors.t4 },
    staffPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    agencyText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 4 },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusActive: { backgroundColor: '#E8F8F1' },
    statusInactive: { backgroundColor: SgateColors.redBg },
    statusText: { fontSize: 11, fontFamily: SgateFonts.semibold },
    statusTextActive: { color: '#16A34A' },
    statusTextInactive: { color: SgateColors.red },

    cardMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metricText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    attTimes: { flexDirection: 'row', gap: 12, marginTop: 16 },
    timeBox: { flex: 1, backgroundColor: SgateColors.bg, borderRadius: 12, padding: 12, alignItems: 'center' },
    timeLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, marginBottom: 4 },
    timeValue: { fontSize: 15, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },

    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t3, marginTop: 12 },
});
