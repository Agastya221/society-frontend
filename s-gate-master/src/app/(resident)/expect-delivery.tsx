import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

export default function ExpectDeliveryScreen() {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.center}>
                <View style={styles.iconCircle}>
                    <Feather name="package" size={32} color={SgateColors.t3} />
                </View>
                <Text style={styles.title}>Add Expected Delivery</Text>
                <Text style={styles.sub}>Coming soon</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    title: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
