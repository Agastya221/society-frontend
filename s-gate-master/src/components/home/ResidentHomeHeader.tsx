import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateBrandMark } from '@/components/Sgate';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { ResidentHomeColors, ResidentHomeRadius, ResidentHomeSpacing } from './ResidentHomeTheme';

interface ResidentHomeHeaderProps {
    towerName: string;
    societyName: string;
    notificationCount: number;
    canOpenContextSheet: boolean;
    onContextPress: () => void;
    onNotificationPress: () => void;
    onSosPress: () => void;
}

export default function ResidentHomeHeader({
    towerName,
    societyName,
    notificationCount,
    canOpenContextSheet,
    onContextPress,
    onNotificationPress,
    onSosPress,
}: ResidentHomeHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
            <View style={styles.identity}>
                <SgateBrandMark size={38} />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Switch home"
                    disabled={!canOpenContextSheet}
                    onPress={onContextPress}
                    style={styles.contextButton}
                >
                    <View style={styles.titleRow}>
                        <Text style={styles.towerName} numberOfLines={1}>{towerName}</Text>
                        {canOpenContextSheet && (
                            <MaterialCommunityIcons name="chevron-down" size={21} color={SgateColors.t1} />
                        )}
                    </View>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={15} color={ResidentHomeColors.danger} />
                        <Text style={styles.societyName} numberOfLines={1}>{societyName}</Text>
                    </View>
                </Pressable>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="SOS emergency"
                    onPress={onSosPress}
                    activeOpacity={0.72}
                    hitSlop={3}
                    style={styles.sosButton}
                >
                    <MaterialCommunityIcons name="alarm-light-outline" size={18} color={ResidentHomeColors.danger} />
                    <Text style={styles.sosText}>SOS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    onPress={onNotificationPress}
                    activeOpacity={0.72}
                    style={styles.notificationButton}
                >
                    <MaterialCommunityIcons name="bell-outline" size={25} color={SgateColors.t1} />
                    {notificationCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: ResidentHomeColors.card,
        paddingHorizontal: ResidentHomeSpacing.gutter,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 7,
    },
    identity: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    contextButton: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    towerName: {
        flexShrink: 1,
        fontSize: 15,
        lineHeight: 20,
        fontFamily: SgateFonts.bold,
        color: ResidentHomeColors.primaryText,
        letterSpacing: -0.35,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    societyName: {
        flexShrink: 1,
        fontSize: 10.5,
        lineHeight: 15,
        fontFamily: SgateFonts.regular,
        color: ResidentHomeColors.secondaryText,
    },
    actions: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    sosButton: {
        height: 38,
        paddingHorizontal: 9,
        borderRadius: ResidentHomeRadius.full,
        backgroundColor: ResidentHomeColors.dangerSurface,
        borderWidth: 1,
        borderColor: ResidentHomeColors.dangerBorder,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    sosText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: ResidentHomeColors.danger,
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: ResidentHomeColors.card,
        borderWidth: 1,
        borderColor: ResidentHomeColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -3,
        minWidth: 19,
        height: 19,
        borderRadius: 10,
        paddingHorizontal: 4,
        backgroundColor: ResidentHomeColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: ResidentHomeColors.card,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: SgateFonts.semibold,
        color: ResidentHomeColors.primaryText,
    },
});
