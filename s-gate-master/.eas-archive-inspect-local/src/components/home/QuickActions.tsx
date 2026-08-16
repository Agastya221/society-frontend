import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { HomeQuickAction } from './homeToolsConfig';

interface QuickActionsProps {
    actions: HomeQuickAction[];
    onActionPress: (route: string) => void;
}

export default function QuickActions({ actions, onActionPress }: QuickActionsProps) {
    // Scalability rules:
    // If the list of actions is larger than 8, slice to first 7 and append a synthesized "More Tools" action.
    let displayedActions = [...actions];
    if (actions.length > 8) {
        const allToolsAction = actions.find(a => a.id.startsWith('allTools')) || actions[actions.length - 1];
        const moreToolsItem: HomeQuickAction = {
            id: 'moreTools',
            icon: 'view-grid-outline',
            label: 'More Tools',
            color: SgateColors.t1,
            bg: SgateColors.gold,
            roles: [],
            route: allToolsAction.route,
        };
        displayedActions = [...actions.slice(0, 7), moreToolsItem];
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
            <View style={styles.grid}>
                {displayedActions.map((item) => (
                    <QuickActionCard
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        color={item.color}
                        bg={item.bg}
                        onPress={() => onActionPress(item.route)}
                    />
                ))}
            </View>
        </View>
    );
}

interface QuickActionCardProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    color: string;
    bg: string;
    onPress: () => void;
}

function QuickActionCard({ icon, label, color, bg, onPress }: QuickActionCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Pressable
            style={styles.item}
            onPress={handlePress}
            onPressIn={() => {
                scale.value = withSpring(0.95, { damping: 18, stiffness: 320 });
            }}
            onPressOut={() => {
                scale.value = withSpring(1, { damping: 18, stiffness: 260 });
            }}
        >
            <Animated.View style={[styles.card, animatedStyle]}>
                <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                    <MaterialCommunityIcons name={icon} size={28} color={color} />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        rowGap: 12,
    },
    item: {
        width: '33.3333%',
        paddingHorizontal: 6,
    },
    card: {
        minHeight: 104,
        borderRadius: 16,
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        gap: 8,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
        lineHeight: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        textAlign: 'center',
        width: '100%',
    },
});
