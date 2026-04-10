import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge {
    label: string;
    color: string;
    bg: string;
}

interface SettingRowProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    subtitle?: string;
    badge?: Badge;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    showChevron?: boolean;
    showDivider?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingRow({
    icon,
    title,
    subtitle,
    badge,
    rightElement,
    onPress,
    danger = false,
    showChevron = true,
    showDivider = true,
}: SettingRowProps) {
    const iconBg = danger ? SgateColors.redBg : SgateColors.surface;
    const iconColor = danger ? SgateColors.red : SgateColors.t2;
    const titleColor = danger ? SgateColors.red : SgateColors.t1;

    return (
        <TouchableOpacity
            style={[styles.row, showDivider && styles.divider]}
            onPress={onPress}
            activeOpacity={0.6}
            disabled={!onPress}
        >
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                <Feather name={icon} size={18} color={iconColor} />
            </View>

            <View style={styles.body}>
                <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
                {subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                ) : null}
            </View>

            {badge ? (
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
            ) : null}

            {rightElement}

            {showChevron ? (
                <Feather name="chevron-right" size={18} color={SgateColors.t4} style={styles.chevron} />
            ) : null}
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },
    badge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },
    chevron: {
        marginLeft: 4,
    },
});
