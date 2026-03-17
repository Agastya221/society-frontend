import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '../../constants/Sgate-theme';

export default function VisitorsScreen() {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Visitors</Text>
            </View>
            <View style={styles.center}>
                <View style={styles.iconCircle}>
                    <Feather name="users" size={32} color={SgateColors.t3} />
                </View>
                <Text style={styles.comingSoon}>Coming Soon</Text>
                <Text style={styles.sub}>Visitor history and management</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root:       { flex: 1, backgroundColor: SgateColors.bg },
    header:     { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft, backgroundColor: SgateColors.card },
    title:      { ...SgateTypography.sectionHeading, color: SgateColors.t1 },
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    comingSoon: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sub:        { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
