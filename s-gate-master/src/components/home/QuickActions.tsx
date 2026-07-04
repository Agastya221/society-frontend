import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import type { HomeQuickAction } from './homeToolsConfig';

interface QuickActionsProps {
    actions: HomeQuickAction[];
    onActionPress: (route: string) => void;
}

export function QuickActions({ actions, onActionPress }: QuickActionsProps) {
    const { width } = useWindowDimensions();
    const columns = getColumnCount(width);
    const maxCards = getMaxVisibleCards(columns);
    const visibleActions = getVisibleActions(actions, maxCards);
    const cardWidth = `${100 / columns}%` as DimensionValue;
    const compact = columns >= 4;

    return (
        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
            <View style={styles.quickGrid}>
                {visibleActions.map((item, index) => (
                    <QuickActionCard
                        key={item.id}
                        index={index}
                        icon={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                        label={item.label}
                        color={item.color}
                        bg={item.bg}
                        onPress={() => onActionPress(item.route)}
                        itemWidth={cardWidth}
                        compact={compact}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

function getColumnCount(width: number): number {
    if (width < 430) return 3;
    if (width < 760) return 4;
    return 5;
}

function getMaxVisibleCards(columns: number): number {
    if (columns === 3) return 9;
    if (columns === 4) return 8;
    return 10;
}

function isAllToolsAction(action: HomeQuickAction): boolean {
    return action.id.toLowerCase().includes('alltools');
}

function getVisibleActions(actions: HomeQuickAction[], maxCards: number): HomeQuickAction[] {
    const allToolsAction = actions.find(isAllToolsAction);
    if (!allToolsAction || actions.length <= maxCards) return actions;

    const primaryActions = actions.filter((action) => !isAllToolsAction(action));
    return [...primaryActions.slice(0, maxCards - 1), allToolsAction];
}

function QuickActionCard({
    index,
    icon,
    label,
    color,
    bg,
    onPress,
    itemWidth,
    compact,
}: {
    index: number;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    color: string;
    bg: string;
    onPress: () => void;
    itemWidth: DimensionValue;
    compact: boolean;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable
            style={[styles.quickItem, { width: itemWidth }]}
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 260 }); }}
        >
            <Animated.View
                entering={FadeInDown.delay(130 + index * 32).springify().damping(18)}
                style={[styles.quickCard, compact && styles.quickCardCompact, animatedStyle]}
            >
                <View style={[styles.quickIcon, compact && styles.quickIconCompact, { backgroundColor: bg }]}>
                    <MaterialCommunityIcons name={icon} size={compact ? 31 : 35} color={color} />
                </View>
                <Text style={[styles.quickLabel, compact && styles.quickLabelCompact]} numberOfLines={2}>
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginBottom: 20,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 18,
        marginHorizontal: -7,
    },
    quickItem: {
        paddingHorizontal: 7,
    },
    quickCard: {
        minHeight: 126,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 7,
        paddingVertical: 16,
        gap: 13,
        borderWidth: 1,
        borderColor: '#F1F1F1',
        ...Platform.select({
            ios: {
                shadowColor: '#111827',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.11,
                shadowRadius: 18,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    quickCardCompact: {
        minHeight: 132,
        borderRadius: 24,
        paddingHorizontal: 6,
        gap: 12,
    },
    quickIcon: {
        width: 62,
        height: 62,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickIconCompact: {
        width: 58,
        height: 58,
        borderRadius: 19,
    },
    quickLabel: {
        fontSize: 14,
        lineHeight: 19,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        textAlign: 'center',
    },
    quickLabelCompact: {
        fontSize: 12,
        lineHeight: 16,
    },
});
