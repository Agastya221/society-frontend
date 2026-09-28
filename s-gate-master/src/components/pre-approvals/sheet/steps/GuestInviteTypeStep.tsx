import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

import { SheetShell } from '../SheetShell';
import { StepHeader } from '../parts/StepHeader';

export type GuestInviteMode = 'quick' | 'group' | 'frequent' | 'private';

const MODES: {
    key: GuestInviteMode;
    title: string;
    desc: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    /** Private invites get the violet treatment. */
    special?: boolean;
}[] = [
    {
        key: 'quick',
        title: 'Quick Invite',
        desc: 'Ensure smooth entry by manually pre-approving guests. Best for small, personal gatherings.',
        icon: 'user-check',
    },
    {
        key: 'group',
        title: 'Party/Group Invite',
        desc: 'Create a common guest invite link with a limit for large gatherings and easy tracking.',
        icon: 'users',
    },
    {
        key: 'frequent',
        title: 'Frequent Invite',
        desc: 'Invite long-term guests with a single passcode, without repeated approvals.',
        icon: 'refresh-cw',
    },
    {
        key: 'private',
        title: 'Private Invite',
        desc: 'This allows silent entries of your guests without disturbing others.',
        icon: 'lock',
        special: true,
    },
];

interface GuestInviteTypeStepProps {
    onSelect: (mode: GuestInviteMode) => void;
    onBack: () => void;
    bottomClearance: number;
}

/** Which kind of guest invite — quick, group, frequent or private. */
export function GuestInviteTypeStep({ onSelect, onBack, bottomClearance }: GuestInviteTypeStepProps) {
    return (
        <SheetShell
            height="fit"
            bottomClearance={bottomClearance}
            header={<StepHeader title="Guest Invite" subtitle="Friends, family visiting" onBack={onBack} />}
            contentContainerStyle={S.body}
        >
            <Text style={S.intro}>
                Create pre-approval of expected visitors to ensure hassle-free entry for them
            </Text>

            {MODES.map(mode => (
                <TouchableOpacity
                    key={mode.key}
                    style={[S.card, mode.special && S.cardSpecial]}
                    onPress={() => onSelect(mode.key)}
                    activeOpacity={0.8}
                >
                    <View style={S.text}>
                        <Text style={[S.title, mode.special && S.titleSpecial]}>{mode.title} ›</Text>
                        <Text style={[S.desc, mode.special && S.descSpecial]}>{mode.desc}</Text>
                    </View>
                    <Feather
                        name={mode.icon}
                        size={26}
                        color={mode.special ? SgateColors.violet : SgateColors.t3}
                    />
                </TouchableOpacity>
            ))}
        </SheetShell>
    );
}

const S = StyleSheet.create({
    body: { paddingHorizontal: SgateLayout.screenGutter, paddingBottom: 4, gap: 10 },
    intro: {
        marginBottom: 4,
        fontSize: 13.5,
        lineHeight: 19,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: SgateLayout.controlHeight / 3.2,
        backgroundColor: SgateColors.surface,
    },
    cardSpecial: { backgroundColor: SgateColors.violetBg },
    text: { flex: 1, minWidth: 0, paddingRight: 4 },
    title: { fontSize: 15.5, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    titleSpecial: { color: SgateColors.violet },
    desc: { marginTop: 3, fontSize: 13, lineHeight: 18, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    descSpecial: { color: SgateColors.violet, opacity: 0.85 },
});
