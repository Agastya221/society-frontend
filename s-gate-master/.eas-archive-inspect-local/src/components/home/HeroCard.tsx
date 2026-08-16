import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';

interface HeroCardProps {
    role: 'resident' | 'admin';
    pendingRequestsCount: number;  // visitors waiting (resident)
    pendingApprovalsCount: number; // actions pending (admin)
    duesPendingCount?: number;     // pending dues (resident)
    onAction: (target: string) => void;
}

export default function HeroCard({
    role,
    pendingRequestsCount,
    pendingApprovalsCount,
    duesPendingCount = 0,
    onAction,
}: HeroCardProps) {
    const scale = useSharedValue(1);

    // Dynamic states resolving
    let eyebrow = "You're all set!";
    let title = "Everything looks\ngood today.";
    let pillText = "Society is running smoothly";
    let isActionable = false;
    let targetRoute = '';

    if (role === 'resident') {
        if (pendingRequestsCount > 0) {
            eyebrow = "Action Required";
            title = `${pendingRequestsCount} visitor${pendingRequestsCount > 1 ? 's are' : ' is'} waiting.`;
            pillText = "Gate approval required";
            isActionable = true;
            targetRoute = 'resident-approvals';
        } else if (duesPendingCount > 0) {
            eyebrow = "Payment Pending";
            title = `${duesPendingCount} bill${duesPendingCount > 1 ? 's are' : ' is'} outstanding.`;
            pillText = "Tap to view dues";
            isActionable = true;
            targetRoute = 'resident-dues';
        }
    } else {
        // Admin
        if (pendingApprovalsCount > 0) {
            eyebrow = "Action Required";
            title = `${pendingApprovalsCount} request${pendingApprovalsCount > 1 ? 's are' : ' is'} pending.`;
            pillText = "Approvals required";
            isActionable = true;
            targetRoute = 'admin-approvals';
        }
    }

    const handlePress = () => {
        if (isActionable) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAction(targetRoute);
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handlePress}
                onPressIn={() => {
                    if (isActionable) {
                        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
                    }
                }}
                onPressOut={() => {
                    if (isActionable) {
                        scale.value = withSpring(1, { damping: 18, stiffness: 260 });
                    }
                }}
                disabled={!isActionable}
                style={({ pressed }) => [
                    styles.pressable,
                    !isActionable && styles.disabledPress,
                ]}
            >
                <Animated.View style={[styles.cardWrapper, animatedStyle]}>
                    <LinearGradient
                        colors={['#FFF9D8', '#FFE37A', '#FFD24A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        <View style={styles.copy}>
                            <Text style={styles.eyebrow}>{eyebrow}</Text>
                            <Text style={styles.title} numberOfLines={2}>
                                {title}
                            </Text>
                            <View style={styles.statusPill}>
                                <View style={[styles.checkCircle, isActionable && styles.actionableCheck]}>
                                    <MaterialCommunityIcons
                                        name={isActionable ? 'alert-circle' : 'check'}
                                        size={14}
                                        color="#FFFFFF"
                                    />
                                </View>
                                <Text style={styles.statusText}>{pillText}</Text>
                                {isActionable && (
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={14}
                                        color={SgateColors.t2}
                                        style={styles.chevron}
                                    />
                                )}
                            </View>
                        </View>
                        <BuildingIllustration />
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </View>
    );
}

function BuildingIllustration() {
    return (
        <View style={styles.illustrationWrap} pointerEvents="none">
            <View style={[styles.cloud, styles.cloudOne]} />
            <View style={[styles.cloud, styles.cloudTwo]} />
            <View style={styles.buildingRow}>
                <View style={[styles.building, styles.buildingSide]}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <View key={`left-${index}`} style={styles.window} />
                    ))}
                </View>
                <View style={[styles.building, styles.buildingMain]}>
                    {Array.from({ length: 12 }).map((_, index) => (
                        <View key={`main-${index}`} style={styles.window} />
                    ))}
                </View>
                <View style={[styles.building, styles.buildingSide]}>
                    {Array.from({ length: 6 }).map((_, index) => (
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
    container: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    pressable: {
        borderRadius: SgateRadius['2xl'],
        overflow: 'hidden',
    },
    disabledPress: {
        opacity: 1,
    },
    cardWrapper: {
        borderRadius: SgateRadius['2xl'],
        overflow: 'hidden',
    },
    gradient: {
        minHeight: 180,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
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
    copy: {
        flex: 1.2,
        zIndex: 2,
        minWidth: 0,
        justifyContent: 'center',
    },
    eyebrow: {
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    title: {
        fontSize: 26,
        lineHeight: 32,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -0.6,
    },
    statusPill: {
        marginTop: 18,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 100,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 12,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#18B86B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionableCheck: {
        backgroundColor: SgateColors.goldDeep,
    },
    statusText: {
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    chevron: {
        marginLeft: 2,
    },
    // Illustration Styles
    illustrationWrap: {
        width: 130,
        height: 130,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginRight: -12,
        marginBottom: -16,
    },
    cloud: {
        position: 'absolute',
        width: 32,
        height: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.75)',
    },
    cloudOne: {
        top: 20,
        left: 0,
    },
    cloudTwo: {
        top: 6,
        right: 12,
        width: 26,
        height: 10,
    },
    buildingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        zIndex: 2,
    },
    building: {
        backgroundColor: '#FFE9C4',
        borderColor: '#E7B878',
        borderWidth: 1,
        borderRadius: 4,
        padding: 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 3,
    },
    buildingMain: {
        width: 44,
        height: 98,
    },
    buildingSide: {
        width: 32,
        height: 74,
    },
    window: {
        width: 6,
        height: 8,
        borderRadius: 1,
        backgroundColor: '#C9904C',
        opacity: 0.72,
    },
    tree: {
        position: 'absolute',
        left: 4,
        bottom: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#9BC455',
        zIndex: 3,
    },
    heroGround: {
        position: 'absolute',
        bottom: 0,
        width: 140,
        height: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(122,96,35,0.12)',
    },
});
