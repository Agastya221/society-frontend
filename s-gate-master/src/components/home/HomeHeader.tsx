import { SgateBrandMark } from '@/components/Sgate';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RoleSwitcher from './RoleSwitcher';

interface HomeHeaderProps {
    towerName: string;
    societyName: string;
    notificationCount: number;
    onNotificationPress: () => void;
    onContextPress: () => void;
    canOpenContextSheet?: boolean;
    showWorkspaceSwitch: boolean;
    currentRole: 'resident' | 'admin';
    onWorkspaceSwitch: () => void;
    switchingWorkspace?: boolean;
}

export default function HomeHeader({
    towerName,
    societyName,
    notificationCount,
    onNotificationPress,
    onContextPress,
    canOpenContextSheet = true,
    showWorkspaceSwitch,
    currentRole,
    onWorkspaceSwitch,
    switchingWorkspace = false,
}: HomeHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <View style={styles.headerTop}>
                {/* Brand Logo & Selector Group */}
                <View style={styles.brandRow}>
                    <View style={styles.logoWrap}>
                        <SgateBrandMark size={36} />
                    </View>
                    <TouchableOpacity
                        style={styles.contextTrigger}
                        activeOpacity={0.7}
                        disabled={!canOpenContextSheet}
                        onPress={onContextPress}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <View style={styles.contextTitleRow}>
                            <Text style={styles.contextTitle} numberOfLines={1}>
                                {towerName}
                            </Text>
                            {canOpenContextSheet && (
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={20}
                                    color={SgateColors.t1}
                                    style={styles.chevron}
                                />
                            )}
                        </View>
                        <View style={styles.societyRow}>
                            <MaterialCommunityIcons
                                name={currentRole === 'admin' ? 'shield-account-outline' : 'map-marker'}
                                size={12}
                                color={currentRole === 'admin' ? SgateColors.goldDeep : '#F43F5E'}
                            />
                            <Text style={styles.societyText} numberOfLines={1}>
                                {societyName}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Actions & Role Switcher */}
                <View style={styles.headerActions}>
                    {showWorkspaceSwitch && (
                        <RoleSwitcher
                            currentRole={currentRole}
                            onSwitch={onWorkspaceSwitch}
                            disabled={switchingWorkspace}
                        />
                    )}
                    <TouchableOpacity
                        style={styles.bellBtn}
                        onPress={onNotificationPress}
                        activeOpacity={0.75}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="bell-outline" size={22} color={SgateColors.t1} />
                        {notificationCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    contextTrigger: {
        flex: 1,
        minWidth: 0,
    },
    contextTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        flexShrink: 1,
    },
    contextTitle: {
        fontSize: 16,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -0.3,
        flexShrink: 1,
    },
    chevron: {
        marginTop: 1,
    },
    societyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 1,
    },
    societyText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        maxWidth: '92%',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 4,
    },
    bellBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8F8F8',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 8,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },
});
