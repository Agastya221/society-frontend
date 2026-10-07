import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

/**
 * The app-wide status chip. Use this instead of hand-rolling a
 * `Record<Status, { bg, color, label }>` map in a screen.
 *
 *   <StatusPill status="PENDING" />                  // label + colour from the status
 *   <StatusPill status="ACTIVE" tone="danger" />     // same word, different meaning
 *   <StatusPill status="FALSE_ALARM" label="False alarm" />
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
type Size = 'sm' | 'md';

const TONES: Record<StatusTone, { bg: string; text: string }> = {
    success: { bg: SgateColors.greenBg, text: SgateColors.green },
    warning: { bg: SgateColors.goldPale, text: SgateColors.goldDeep },
    danger: { bg: SgateColors.redBg, text: SgateColors.red },
    info: { bg: SgateColors.blueBg, text: SgateColors.blue },
    accent: { bg: SgateColors.violetBg, text: SgateColors.violet },
    neutral: { bg: SgateColors.surface, text: SgateColors.t3 },
};

/**
 * Default tone per status.
 *
 * NOTE: a few words mean different things per domain — an ACTIVE pass is good
 * (success) but an ACTIVE emergency is not. Those screens pass `tone` explicitly;
 * the defaults here are the most common reading.
 */
const STATUS_TONES: Record<string, StatusTone> = {
    // passes / pre-approvals
    ACTIVE: 'success',
    USED: 'info',
    EXPIRED: 'neutral',
    CANCELLED: 'danger',
    REVOKED: 'danger',
    // approvals
    PENDING: 'warning',
    PENDING_APPROVAL: 'warning',
    RESUBMIT_REQUESTED: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    DENIED: 'danger',
    // billing
    PAID: 'success',
    UNPAID: 'warning',
    OVERDUE: 'danger',
    WAIVED: 'info',
    // complaints
    OPEN: 'info',
    IN_PROGRESS: 'warning',
    RESOLVED: 'success',
    CLOSED: 'neutral',
    // emergencies
    TRIGGERED: 'danger',
    ACKNOWLEDGED: 'warning',
    FALSE_ALARM: 'neutral',
    // priorities
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger',
    // gate movement
    IN: 'success',
    OUT: 'neutral',
};

/**
 * The same colours the pill uses, for screens that also tint something else
 * (an accent bar, an avatar) to match a row's status.
 */
export function statusColors(status: string, tone?: StatusTone) {
    return TONES[tone ?? STATUS_TONES[String(status ?? '').toUpperCase()] ?? 'neutral'];
}

const SIZES: Record<Size, { fontSize: number; paddingH: number; paddingV: number }> = {
    sm: { fontSize: 10, paddingH: 8, paddingV: 2 },
    md: { fontSize: 11, paddingH: 10, paddingV: 3 },
};

export interface StatusPillProps {
    /** Status key, e.g. `ACTIVE`. Case-insensitive; unknown values render neutral. */
    status: string;
    /** Override the tone when the status means something different here. */
    tone?: StatusTone;
    /** Override the displayed text. Defaults to a title-cased status. */
    label?: string;
    size?: Size;
    /** UPPERCASE the label (used by the complaint/priority chips). */
    uppercase?: boolean;
}

/** `IN_PROGRESS` → `In Progress` */
function titleCase(status: string) {
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusPill({ status, tone, label, size = 'md', uppercase = false }: StatusPillProps) {
    const key = String(status ?? '').toUpperCase();
    const { bg, text } = TONES[tone ?? STATUS_TONES[key] ?? 'neutral'];
    const s = SIZES[size];
    const copy = label ?? titleCase(key || 'Unknown');

    return (
        <View style={[styles.pill, { backgroundColor: bg, paddingHorizontal: s.paddingH, paddingVertical: s.paddingV }]}>
            <Text style={[styles.label, { color: text, fontSize: s.fontSize }, uppercase && styles.upper]}>
                {uppercase ? copy.toUpperCase() : copy}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    label: {
        fontFamily: SgateFonts.semibold,
    },
    upper: {
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.4,
    },
});
