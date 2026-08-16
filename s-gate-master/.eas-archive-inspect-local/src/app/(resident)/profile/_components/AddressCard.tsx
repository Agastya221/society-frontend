import React from 'react';
import { Platform, StyleSheet, Text, ToastAndroid, TouchableOpacity, View, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SgateColors, SgateFonts, SgateRadius } from '../../../../constants/Sgate-theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddressCardProps {
    flatNumber?: string;
    blockName?: string;
    societyName?: string;
    societyAddress?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressCard({ flatNumber, blockName, societyName, societyAddress }: AddressCardProps) {
    const parts: string[] = [];
    if (flatNumber) {
        parts.push(blockName ? `${blockName} ${flatNumber}` : flatNumber);
    }
    if (societyName) parts.push(societyName);
    if (societyAddress) parts.push(societyAddress);

    const fullAddress = parts.join(', ') || 'No address available';

    const handleShare = async () => {
        try {
            await Clipboard.setStringAsync(fullAddress);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Address copied to clipboard', ToastAndroid.SHORT);
            }

            // Open native share sheet
            await Share.share({
                message: fullAddress,
            });
        } catch {
            // Silent
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Header row */}
                <View style={styles.headerRow}>
                    <Text style={styles.label}>My Address</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.7}>
                        <Text style={styles.shareText}>Share</Text>
                        <Feather name="share-2" size={13} color={SgateColors.t2} />
                    </TouchableOpacity>
                </View>

                {/* Address */}
                <Text style={styles.address}>{fullAddress}</Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginTop: 12,
    },
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    shareText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    address: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 20,
    },
});
