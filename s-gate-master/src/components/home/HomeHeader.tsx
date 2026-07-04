import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateBrandMark } from '@/components/Sgate';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import { RoleSwitcher } from './RoleSwitcher';
import type { UserRole } from './homeToolsConfig';

const BRAND_YELLOW = '#FFB800';
const BRAND_YELLOW_BG = '#FFFBE6';

interface HomeHeaderProps {
    topInset: number;
    towerName: string;
    societyName: string;
    notificationCount: number;
    gateAlertCount: number;
    canOpenContextSheet: boolean;
    showWorkspaceSwitch: boolean;
    currentRole: UserRole;
    onContextPress: () => void;
    onNotificationPress: () => void;
    onWorkspaceSwitch: () => void;
}

export function HomeHeader({
    topInset,
    towerName,
    societyName,
    notificationCount,
    gateAlertCount,
    canOpenContextSheet,
    showWorkspaceSwitch,
    currentRole,
    onContextPress,
    onNotificationPress,
    onWorkspaceSwitch,
}: HomeHeaderProps) {
    return (
        <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.header, { paddingTop: topInset + 18 }]}>
            <View style={styles.headerTop}>
                <View style={styles.brandRow}>
                    <View style={styles.logoWrap}>
                        <SgateBrandMark size={62} />
                    </View>
                    <TouchableOpacity
                        style={styles.contextTrigger}
                        activeOpacity={0.7}
                        disabled={!canOpenContextSheet}
                        onPress={onContextPress}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                        <View style={styles.contextTitleRow}>
                            <Text style={styles.contextTitle} numberOfLines={1}>{towerName}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={24} color={SgateColors.t1} />
                        </View>
                        <View style={styles.societyRow}>
                            <MaterialCommunityIcons name="map-marker" size={16} color="#F43F5E" />
                            <Text style={styles.societyText} numberOfLines={1}>{societyName}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.headerActions}>
                    <RoleSwitcher
                        visible={showWorkspaceSwitch}
                        currentRole={currentRole}
                        onPress={onWorkspaceSwitch}
                    />
                    <TouchableOpacity
                        style={styles.bellBtn}
                        onPress={onNotificationPress}
                        activeOpacity={0.78}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

            {gateAlertCount > 0 && (
                <TouchableOpacity style={styles.gateAlert} activeOpacity={0.84}>
                    <View style={styles.gateAlertDot} />
                    <Text style={styles.gateAlertText}>
                        {gateAlertCount} visitor{gateAlertCount > 1 ? 's' : ''} waiting at the gate
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#996300" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 28,
        paddingBottom: 20,
        gap: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
        flexShrink: 1,
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    contextTrigger: {
        flex: 1,
        minWidth: 0,
        maxWidth: 98,
    },
    contextTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
    },
    contextTitle: {
        flexShrink: 1,
        fontSize: 27,
        lineHeight: 34,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    societyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    societyText: {
        flexShrink: 1,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        flexShrink: 0,
    },
    bellBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF8E6',
        borderWidth: 1,
        borderColor: '#F4E4B7',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 6,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: BRAND_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 8,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },
    gateAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: BRAND_YELLOW_BG,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    gateAlertDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: BRAND_YELLOW,
    },
    gateAlertText: {
        flex: 1,
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#996300',
    },
});
