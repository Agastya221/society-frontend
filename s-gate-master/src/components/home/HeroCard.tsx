import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import type { UserRole } from './homeToolsConfig';

interface HeroCardProps {
    role: UserRole;
    pendingRequestsCount: number;
    pendingApprovalsCount: number;
    duesPendingCount?: number;
    onAction: (target: string) => void;
}

interface HeroState {
    eyebrow: string;
    title: string;
    pill: string;
    target: string | null;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    tone: 'success' | 'attention';
}

export function HeroCard({
    role,
    pendingRequestsCount,
    pendingApprovalsCount,
    duesPendingCount = 0,
    onAction,
}: HeroCardProps) {
    const state = getHeroState(role, pendingRequestsCount, pendingApprovalsCount, duesPendingCount);
    const isActionable = Boolean(state.target);

    return (
        <Animated.View entering={FadeInDown.delay(50).duration(420)} style={styles.heroSection}>
            <Pressable
                disabled={!isActionable}
                onPress={() => {
                    if (state.target) onAction(state.target);
                }}
            >
                <LinearGradient
                    colors={['#FFF8C9', '#FFE47A', '#FFD01F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroCopy}>
                        <Text style={styles.heroEyebrow}>{state.eyebrow}</Text>
                        <Text style={styles.heroTitle}>{state.title}</Text>
                        <View style={styles.heroStatusPill}>
                            <View style={[styles.heroCheck, state.tone === 'attention' && styles.heroAttention]}>
                                <MaterialCommunityIcons name={state.icon} size={15} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroStatusText}>{state.pill}</Text>
                            {isActionable && (
                                <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t2} />
                            )}
                        </View>
                    </View>
                    <BuildingIllustration />
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

function getHeroState(
    role: UserRole,
    pendingRequestsCount: number,
    pendingApprovalsCount: number,
    duesPendingCount: number,
): HeroState {
    if (role === 'resident') {
        if (pendingRequestsCount > 0) {
            return {
                eyebrow: 'Action needed',
                title: `${pendingRequestsCount} visitor${pendingRequestsCount > 1 ? 's' : ''}\nwaiting`,
                pill: 'Gate action required',
                target: 'resident-approvals',
                icon: 'alert',
                tone: 'attention',
            };
        }

        if (duesPendingCount > 0) {
            return {
                eyebrow: 'Payment pending',
                title: `${duesPendingCount} due${duesPendingCount > 1 ? 's' : ''}\npending`,
                pill: 'Tap to view dues',
                target: 'resident-dues',
                icon: 'receipt-text-outline',
                tone: 'attention',
            };
        }
    }

    if (role === 'admin' && pendingApprovalsCount > 0) {
        return {
            eyebrow: 'Action needed',
            title: `${pendingApprovalsCount} action${pendingApprovalsCount > 1 ? 's' : ''}\npending`,
            pill: 'Approvals required',
            target: 'admin-approvals',
            icon: 'clipboard-alert-outline',
            tone: 'attention',
        };
    }

    return {
        eyebrow: "You're all set!",
        title: 'Everything looks\ngood today.',
        pill: 'Society is running smoothly',
        target: null,
        icon: 'check',
        tone: 'success',
    };
}

function BuildingIllustration() {
    return (
        <View style={styles.illustrationWrap} pointerEvents="none">
            <View style={[styles.cloud, styles.cloudOne]} />
            <View style={[styles.cloud, styles.cloudTwo]} />
            <View style={styles.buildingRow}>
                <View style={[styles.building, styles.buildingSide]}>
                    {Array.from({ length: 9 }).map((_, index) => (
                        <View key={`left-${index}`} style={styles.window} />
                    ))}
                </View>
                <View style={[styles.building, styles.buildingMain]}>
                    {Array.from({ length: 15 }).map((_, index) => (
                        <View key={`main-${index}`} style={styles.window} />
                    ))}
                </View>
                <View style={[styles.building, styles.buildingSide]}>
                    {Array.from({ length: 9 }).map((_, index) => (
                        <View key={`right-${index}`} style={styles.window} />
                    ))}
                </View>
            </View>
            <View style={styles.tree} />
            <View style={styles.heroGround} />
        </View>
    );
}

const styles = StyleSheet.create({
    heroSection: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    heroCard: {
        minHeight: 180,
        borderRadius: 28,
        paddingVertical: 24,
        paddingLeft: 24,
        paddingRight: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#DCA400',
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.16,
                shadowRadius: 26,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    heroCopy: {
        flex: 1,
        zIndex: 2,
        minWidth: 0,
    },
    heroEyebrow: {
        fontSize: 16,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 27,
        lineHeight: 36,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    heroStatusPill: {
        marginTop: 22,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.82)',
        borderRadius: 999,
        paddingVertical: 10,
        paddingLeft: 10,
        paddingRight: 16,
    },
    heroCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#18B86B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAttention: {
        backgroundColor: '#F43F5E',
    },
    heroStatusText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    illustrationWrap: {
        width: 178,
        height: 150,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginRight: -18,
        marginBottom: -16,
    },
    cloud: {
        position: 'absolute',
        width: 38,
        height: 15,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.78)',
    },
    cloudOne: {
        top: 14,
        left: 18,
    },
    cloudTwo: {
        top: 0,
        right: 18,
        width: 30,
        height: 12,
    },
    buildingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 5,
        zIndex: 2,
    },
    building: {
        backgroundColor: '#FFE9C4',
        borderColor: '#E7B878',
        borderWidth: 1,
        borderRadius: 5,
        padding: 5,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 4,
    },
    buildingMain: {
        width: 58,
        height: 118,
    },
    buildingSide: {
        width: 44,
        height: 92,
    },
    window: {
        width: 8,
        height: 11,
        borderRadius: 2,
        backgroundColor: '#C9904C',
        opacity: 0.72,
    },
    tree: {
        position: 'absolute',
        left: 18,
        bottom: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#9BC455',
        zIndex: 3,
    },
    heroGround: {
        position: 'absolute',
        bottom: 0,
        width: 172,
        height: 14,
        borderRadius: 999,
        backgroundColor: 'rgba(122,96,35,0.16)',
    },
});
