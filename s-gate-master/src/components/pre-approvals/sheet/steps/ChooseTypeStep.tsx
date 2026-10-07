import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from 'react-native-reanimated';

import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

import { SheetShell } from '../SheetShell';
import { StepHeader } from '../parts/StepHeader';

/** The staggered card entry the sheet opens with. */
const SPRING_SNAPPY = { damping: 18, stiffness: 280, mass: 0.6 };
const STAGGER_MS = 40;

export type InviteType = 'GUEST' | 'CAB' | 'DELIVERY' | 'SERVICE';

export const INVITE_TYPES: {
    key: InviteType;
    label: string;
    desc: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    iconColor: string;
    iconBg: string;
}[] = [
    { key: 'GUEST', label: 'Guest', desc: 'Friends, family visiting', icon: 'users', iconColor: SgateColors.goldDeep, iconBg: SgateColors.goldPale },
    { key: 'CAB', label: 'Cab', desc: 'Uber, Ola, booked taxi', icon: 'navigation', iconColor: SgateColors.blue, iconBg: SgateColors.blueBg },
    { key: 'DELIVERY', label: 'Delivery', desc: 'Amazon, Swiggy, packages', icon: 'package', iconColor: SgateColors.green, iconBg: SgateColors.greenBg },
    { key: 'SERVICE', label: 'Service', desc: 'Plumber, electrician, repairs', icon: 'tool', iconColor: SgateColors.t2, iconBg: SgateColors.surface },
];

function TypeCard({ option, index, onPress }: {
    option: typeof INVITE_TYPES[number];
    index: number;
    onPress: () => void;
}) {
    const enter = useSharedValue(0);

    useEffect(() => {
        enter.value = withDelay(index * STAGGER_MS, withSpring(1, SPRING_SNAPPY));
    }, [enter, index]);

    const style = useAnimatedStyle(() => ({
        opacity: enter.value,
        transform: [
            { translateY: interpolate(enter.value, [0, 1], [20, 0]) },
            { scale: interpolate(enter.value, [0, 1], [0.97, 1]) },
        ],
    }));

    return (
        <Animated.View style={style}>
            <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.8}>
                <View style={[S.icon, { backgroundColor: option.iconBg }]}>
                    <Feather name={option.icon} size={22} color={option.iconColor} />
                </View>
                <View style={S.text}>
                    <Text style={S.label}>{option.label}</Text>
                    <Text style={S.desc}>{option.desc}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={SgateColors.t4} />
            </TouchableOpacity>
        </Animated.View>
    );
}

interface ChooseTypeStepProps {
    onSelect: (type: InviteType) => void;
    bottomClearance: number;
}

/**
 * The sheet's first step — what are we pre-approving?
 *
 * `fit` height: four short rows, so the sheet should sit low rather than
 * stretching up the screen.
 */
export function ChooseTypeStep({ onSelect, bottomClearance }: ChooseTypeStepProps) {
    return (
        <SheetShell
            height="fit"
            bottomClearance={bottomClearance}
            header={<StepHeader title="Allow Future Entries" subtitle="Who do you want to pre-approve?" />}
            contentContainerStyle={S.body}
        >
            {INVITE_TYPES.map((option, index) => (
                <TypeCard
                    key={option.key}
                    option={option}
                    index={index}
                    onPress={() => onSelect(option.key)}
                />
            ))}
        </SheetShell>
    );
}

const S = StyleSheet.create({
    body: { paddingHorizontal: SgateLayout.screenGutter, paddingBottom: 4, gap: 10 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: SgateLayout.controlHeight / 3.2,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.card,
    },
    icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0 },
    label: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    desc: { marginTop: 2, fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
