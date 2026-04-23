import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

export default function ExpectDeliveryScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={styles.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 10) }]}>
                <View style={styles.headerInner}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleMain}>Expected Delivery</Text>
                </View>
            </View>

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
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconBtn: {
        width: 32,
        height: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitleMain: {
        flex: 1,
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
    },
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
