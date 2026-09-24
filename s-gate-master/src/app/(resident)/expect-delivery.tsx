import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

export default function ExpectDeliveryScreen() {

    const router = useRouter();

    return (
        <View style={styles.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            
            {/* Header */}
            <ScreenHeader title="Expected Delivery" onBack={() => router.back()} />

            <View style={styles.center}>
                <View style={styles.iconCircle}>
                    <Feather name="package" size={40} color={SgateColors.t4} />
                </View>
                <Text style={styles.title}>Add Expected Delivery</Text>
                <Text style={styles.sub}>Coming soon</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 12, 
        paddingBottom: 60,
        paddingHorizontal: 40,
    },
    iconCircle: {
        width: 84, 
        height: 84, 
        borderRadius: 42,
        backgroundColor: '#F8F9FA',
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 8,
    },
    title: { 
        fontSize: 20, 
        fontFamily: SgateFonts.bold, 
        color: SgateColors.t1,
        textAlign: 'center',
    },
    sub: { 
        fontSize: 15, 
        fontFamily: SgateFonts.regular, 
        color: SgateColors.t3,
        textAlign: 'center',
    },
});
