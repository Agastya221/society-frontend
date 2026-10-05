import { GuardColors, GuardRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Result UI shared by the Pre-approved screen and the Scan screen, so a pass
// looks the same whether the guard looked it up by flat or scanned its QR.

export interface Schedule {
    date?: string | null; startTime?: string | null; endTime?: string | null;
    validFrom?: string | null; validUntil?: string | null; daysOfWeek?: string[];
    timeFrom?: string | null; timeTo?: string | null;
}

/** Why one pass was not valid right now (additive field on the validate response). */
export interface PassReason {
    entryId?: string;
    reason?: string;
    message?: string;
    displayLabel?: string;
    /** Server-described window: ONCE {date: 'YYYY-MM-DD', startTime, endTime} or RECURRING {timeFrom, timeTo, daysOfWeek, validUntil}. */
    window?: string | Schedule | null;
}

/** POST /guard/pre-approved/validate result (one pass, or a pick list in `matches`). */
export interface Match {
    allowed: boolean;
    entryId?: string;
    type?: string;
    mode?: string;
    displayLabel?: string;
    isPrivate: boolean;
    flatNumber?: string;
    residentName?: string;
    reason?: string;
    message?: string;
    matches?: Match[];
    reasons?: PassReason[];
}

/** GET /guard/pre-approved row — used only for each pass's window and visitor. */
export interface ListedPass {
    id: string; type: string; mode: string; scheduleType: string; displayLabel: string;
    isPrivate: boolean; flatNumber?: string; residentName?: string; visitorName?: string | null;
    /** Newer servers also send flatId / flat {id, flatNumber, block}. */
    flatId?: string; flat?: { id: string; flatNumber: string; block?: { id: string; name: string } | null } | null;
    schedule?: Schedule | null;
}

const IST_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Schedule dates come back as midnight of the pass day (UTC); shifting to IST keeps that calendar day. */
function istDay(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return iso;
    const d = new Date(t + IST_MS);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function windowLabel(s?: Schedule | string | null): string | null {
    if (!s) return null;
    if (typeof s === 'string') return s.trim() || null;
    if (s.date && s.startTime && s.endTime) return `${istDay(s.date)} · ${s.startTime} – ${s.endTime}`;
    if (s.timeFrom && s.timeTo) {
        const days = s.daysOfWeek?.length ? s.daysOfWeek.map((d) => d.charAt(0) + d.slice(1, 3).toLowerCase()).join(', ') : 'Daily';
        const until = s.validUntil ? ` · until ${istDay(s.validUntil)}` : '';
        return `${days} · ${s.timeFrom} – ${s.timeTo}${until}`;
    }
    return null;
}

const REASON_TAGS: Record<string, string> = {
    TOO_EARLY: 'Too early',
    TOO_LATE: 'Ended',
    WRONG_DATE: 'Other day',
    WRONG_DAY: 'Not today',
    NOT_STARTED: 'Not started',
    NOT_YET_VALID: 'Not started',
    OUTSIDE_HOURS: 'Outside hours',
    EXPIRED: 'Expired',
    USED: 'Used',
    CANCELLED: 'Cancelled',
    ENTRY_LOCKED: 'In use',
    DAILY_LIMIT_REACHED: 'Limit reached',
};

/** /use answers 409 when another guard used or changed the pass first. */
export function conflictTitle(err: any): string | undefined {
    return err?.response?.status === 409 ? 'Pass already used' : undefined;
}

export function reasonTag(reason?: string): string {
    return (reason && REASON_TAGS[reason]) || 'Not now';
}

export interface ReasonRowData { key: string; title: string; detail: string; tag: string }

/** Rows for the per-pass `reasons` the backend returns; listed passes fill in label and window. */
export function reasonRows(reasons: PassReason[] | undefined, listed: Record<string, ListedPass>): ReasonRowData[] {
    if (!Array.isArray(reasons)) return [];
    return reasons.map((r, i) => {
        const pass = r.entryId ? listed[r.entryId] : undefined;
        const label = pass?.displayLabel ?? r.displayLabel ?? 'Pre-approved pass';
        const title = `${label}${pass?.visitorName && !label.includes(pass.visitorName) ? ` · ${pass.visitorName}` : ''}`;
        const window = windowLabel(r.window) ?? windowLabel(pass?.schedule);
        const detail = [r.message, window].filter(Boolean).join(' · ') || 'No time window';
        return { key: r.entryId ?? `reason-${i}`, title, detail, tag: reasonTag(r.reason) };
    });
}

export function StatusBanner({ ok, title, text }: { ok: boolean; title: string; text: string }) {
    return (
        <View style={[S.banner, ok ? S.bannerOk : S.bannerBad]}>
            <View style={[S.bannerIcon, { backgroundColor: ok ? GuardColors.green : GuardColors.red }]}>
                <Ionicons name={ok ? 'checkmark' : 'close'} size={30} color="#fff" />
            </View>
            <Text style={[S.bannerTitle, { color: ok ? GuardColors.green : GuardColors.red }]}>{title}</Text>
            <Text style={S.bannerText}>{text}</Text>
        </View>
    );
}

export function PassCard({ match, schedule, visitorName, children }: {
    match: Match; schedule?: Schedule | null; visitorName?: string | null; children?: React.ReactNode;
}) {
    const window = windowLabel(schedule);
    const rows: [keyof typeof Ionicons.glyphMap, string, string][] = [];
    if (visitorName && !match.displayLabel?.includes(visitorName)) rows.push(['person-outline', 'Visitor', visitorName]);
    if (match.isPrivate) rows.push(['eye-off-outline', 'Flat', 'Hidden (private pickup)']);
    else if (match.flatNumber) rows.push(['home-outline', 'Flat', match.flatNumber === 'OFFICE' ? 'Admin Office' : match.flatNumber]);
    if (match.residentName) rows.push(['person-circle-outline', 'Resident', match.residentName]);
    if (window) rows.push(['time-outline', 'Valid', window]);

    return (
        <View style={S.passCard}>
            <View style={S.passHead}>
                <View style={S.passIcon}>
                    <Ionicons name={match.type === 'CAB' ? 'car' : match.type === 'HELP' ? 'construct' : 'cube'} size={20} color={GuardColors.black} />
                </View>
                <Text style={S.passTitle} numberOfLines={2}>{match.displayLabel ?? 'Pre-approved entry'}</Text>
            </View>
            {rows.map(([icon, label, value]) => (
                <View key={label} style={S.passRow}>
                    <Ionicons name={icon} size={16} color={GuardColors.t3} />
                    <Text style={S.passLabel}>{label}</Text>
                    <Text style={S.passValue} numberOfLines={2}>{value}</Text>
                </View>
            ))}
            {children}
        </View>
    );
}

/** One "not valid right now" row: the pass, why, and its window. */
export function PassReasonRow({ title, detail, tag }: Omit<ReasonRowData, 'key'>) {
    return (
        <View style={S.relatedRow}>
            <Ionicons name="time-outline" size={18} color={GuardColors.t3} />
            <View style={{ flex: 1 }}>
                <Text style={S.relatedTitle}>{title}</Text>
                <Text style={S.relatedSub}>{detail}</Text>
            </View>
            <Text style={S.relatedTag}>{tag}</Text>
        </View>
    );
}

export const passStyles = StyleSheet.create({
    allowBtn: { marginTop: 6, height: 52, borderRadius: GuardRadius.md, backgroundColor: GuardColors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    allowText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

const S = StyleSheet.create({
    banner: { borderRadius: GuardRadius.lg, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 16 },
    bannerOk: { backgroundColor: GuardColors.greenBg, borderColor: '#BDEFD9' },
    bannerBad: { backgroundColor: GuardColors.redBg, borderColor: '#F3CECE' },
    bannerIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    bannerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    bannerText: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '600', color: GuardColors.t2, textAlign: 'center' },

    passCard: { backgroundColor: GuardColors.card, borderRadius: GuardRadius.lg, borderWidth: 1, borderColor: GuardColors.borderSoft, padding: 16, marginBottom: 12, gap: 8 },
    passHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    passIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
    passTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: GuardColors.t1 },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GuardColors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    passLabel: { fontSize: 13, fontWeight: '600', color: GuardColors.t3, width: 72 },
    passValue: { flex: 1, fontSize: 14, fontWeight: '700', color: GuardColors.t1, textAlign: 'right' },

    relatedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: GuardColors.card, borderRadius: 14, borderWidth: 1, borderColor: GuardColors.borderSoft, padding: 14, marginBottom: 8 },
    relatedTitle: { fontSize: 14, fontWeight: '800', color: GuardColors.t1 },
    relatedSub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: GuardColors.t3 },
    relatedTag: { fontSize: 11, fontWeight: '800', color: GuardColors.red, backgroundColor: GuardColors.redBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
