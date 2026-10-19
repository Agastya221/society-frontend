import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { listTrustedVisitors, removeTrustedVisitor, type TrustedVisitor } from '@/services/gate.service';

/** People this flat always lets in (tutor, relative...): the gate does not ask each time. */
export default function TrustedVisitorsScreen() {
    const router = useRouter();
    const [rows, setRows] = useState<TrustedVisitor[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setRows(await listTrustedVisitors());
        } catch {
            AppAlert.show('Could not load', 'Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const remove = (row: TrustedVisitor) => {
        AppAlert.show(
            `Remove ${row.name}?`,
            'They will need your approval at the gate again.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: async () => {
                        try {
                            await removeTrustedVisitor(row.id);
                            setRows((prev) => prev.filter((r) => r.id !== row.id));
                        } catch {
                            AppAlert.show('Could not remove', 'Please try again.');
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={styles.root}>
            <ScreenHeader title="Always-allowed visitors" onBack={() => router.back()} />
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={SgateColors.gold} /></View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(row) => row.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <EmptyState
                            iconName="shield-outline"
                            title="Nobody yet"
                            description="After a visitor arrives, open Visitor Approvals and tap 'Always allow this visitor'. They will not need your approval next time."
                        />
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.icon}><Ionicons name="shield-checkmark" size={22} color={SgateColors.goldDeep} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.phone}>{item.phone}</Text>
                            </View>
                            <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} style={styles.removeBtn}>
                                <Text style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 20, paddingBottom: 100, gap: 12, flexGrow: 1 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border ?? '#EEE' },
    icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    phone: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t2, marginTop: 2 },
    removeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FDECEC' },
    removeText: { fontFamily: SgateFonts.bold, fontSize: 13, color: '#C62828' },
});
