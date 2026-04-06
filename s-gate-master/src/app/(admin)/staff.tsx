import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { Avatar } from '@/components/ui/Avatar';
import { getStaffAttendance, getStaffList, StaffAttendance, StaffMember } from '@/services/staffService';

// Helpers
const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function StaffManagementScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE'>('DIRECTORY');
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
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Avatar name={item.name} size={46} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.staffName}>{item.name}</Text>
                        <View style={styles.roleWrap}>
                            <View style={styles.roleDot} />
                            <Text style={styles.staffRole}>{item.role}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardMetrics}>
                    <View style={styles.metric}>
                        <Feather name="clock" size={14} color={SgateColors.t3} />
                        <Text style={styles.metricText}>{item.shiftStart} - {item.shiftEnd}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Feather name="briefcase" size={14} color={SgateColors.t3} />
                        <Text style={styles.metricText}>₹{item.salary.toLocaleString()}/mo</Text>
                    </View>
                    <View style={styles.metric}>
                        <Feather name="home" size={14} color={SgateColors.t3} />
                        <Text style={styles.metricText}>{item.assignedFlats.length > 1 ? `${item.assignedFlats.length} Flats` : item.assignedFlats[0]}</Text>
                    </View>
                </View>
            </View>
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

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Staff & Payroll</Text>
                    <Text style={styles.headerSub}>Manage society workers</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                    <Feather name="plus" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsWrap}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'DIRECTORY' && styles.tabActive]}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab('DIRECTORY'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'DIRECTORY' && styles.tabTextActive]}>Directory</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ATTENDANCE' && styles.tabActive]}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab('ATTENDANCE'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'ATTENDANCE' && styles.tabTextActive]}>Today's Logs</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                </View>
            ) : (
                <FlatList
                    data={staff}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={activeTab === 'DIRECTORY' ? renderStaffCard : renderAttendanceCard}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Feather name="users" size={40} color={SgateColors.t4} />
                            <Text style={styles.emptyText}>No staff records found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 10,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    addBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: SgateColors.t1, alignItems: 'center', justifyContent: 'center' },
    
    tabsWrap: {
        flexDirection: 'row',
        backgroundColor: SgateColors.card,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: SgateColors.goldDeep },
    tabText: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
    tabTextActive: { color: SgateColors.goldDeep },

    list: { padding: 20, paddingBottom: 100 },
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardInfo: { flex: 1 },
    staffName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    roleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.goldDeep },
    staffRole: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusActive: { backgroundColor: SgateColors.greenBg },
    statusInactive: { backgroundColor: SgateColors.redBg },
    statusText: { fontSize: 10, fontFamily: SgateFonts.bold },
    statusTextActive: { color: SgateColors.green },
    statusTextInactive: { color: SgateColors.red },

    divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 14 },
    cardMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metricText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },

    attTimes: { flexDirection: 'row', gap: 12, marginTop: 16 },
    timeBox: { flex: 1, backgroundColor: SgateColors.bg, borderRadius: 12, padding: 12, alignItems: 'center' },
    timeLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, marginBottom: 4 },
    timeValue: { fontSize: 15, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },

    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t3, marginTop: 12 },
});
