import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { SgateFonts } from '@/constants/Sgate-theme';
import type { EntryRequest } from '@/types/api';
import {
    ResidentHomeColors,
    ResidentHomeRadius,
    ResidentHomeSpacing,
} from './ResidentHomeTheme';

export interface ResidentSocietyUpdate {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    kind: 'notice' | 'delivery' | 'maintenance';
}

export function SectionHeading({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
    return (
        <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onViewAll && (
                <Pressable onPress={onViewAll} hitSlop={8} style={styles.viewAll}>
                    <Text style={styles.viewAllText}>View all</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={ResidentHomeColors.secondaryText} />
                </Pressable>
            )}
        </View>
    );
}

export function SocietyStatusCard({ residentName }: { residentName: string }) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <View style={styles.hero}>
            <View style={styles.heroCopy}>
                <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>{greeting}, {residentName} <Text style={styles.wave}>👋</Text></Text>
                <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Everything looks good</Text>
                <View style={styles.statusPill}>
                    <View style={styles.statusCheck}>
                        <MaterialCommunityIcons name="check" size={17} color={ResidentHomeColors.card} />
                    </View>
                    <Text style={styles.statusText}>Society is running smoothly</Text>
                </View>
            </View>
            <BuildingScene />
        </View>
    );
}

function BuildingScene() {
    return (
        <View pointerEvents="none" style={styles.scene}>
            <View style={styles.sun} />
            <View style={styles.buildingGroup}>
                <View style={[styles.building, styles.sideBuilding]}>
                    <WindowGrid count={6} />
                </View>
                <View style={[styles.building, styles.mainBuilding]}>
                    <WindowGrid count={12} />
                    <View style={styles.door} />
                </View>
                <View style={[styles.building, styles.sideBuilding]}>
                    <WindowGrid count={6} />
                </View>
            </View>
            <View style={[styles.tree, styles.treeLeft]} />
            <View style={[styles.tree, styles.treeRight]} />
            <View style={styles.ground} />
        </View>
    );
}

function WindowGrid({ count }: { count: number }) {
    return (
        <View style={styles.windowGrid}>
            {Array.from({ length: count }).map((_, index) => <View key={index} style={styles.window} />)}
        </View>
    );
}

interface GlanceCardProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconColor: string;
    iconBackground: string;
    value: string;
    label: string[];
    onPress: () => void;
}

export function AtAGlanceSection({
    waitingCount,
    deliveryCount,
    duesAmount,
    onVisitorsPress,
    onDeliveryPress,
    onDuesPress,
}: {
    waitingCount: number;
    deliveryCount: number | null;
    duesAmount: number | null;
    onVisitorsPress: () => void;
    onDeliveryPress: () => void;
    onDuesPress: () => void;
}) {
    return (
        <View style={styles.section}>
            <SectionHeading title="AT A GLANCE" onViewAll={onVisitorsPress} />
            <View style={styles.glanceRow}>
                <GlanceCard
                    icon="account-group-outline"
                    iconColor={ResidentHomeColors.blue}
                    iconBackground={ResidentHomeColors.blueSurface}
                    value={String(waitingCount)}
                    label={['Visitors', 'Waiting']}
                    onPress={onVisitorsPress}
                />
                <GlanceCard
                    icon="package-variant"
                    iconColor={ResidentHomeColors.orange}
                    iconBackground={ResidentHomeColors.orangeSurface}
                    value={deliveryCount === null ? '—' : String(deliveryCount)}
                    label={['Delivery', 'Today']}
                    onPress={onDeliveryPress}
                />
                <GlanceCard
                    icon="file-document-outline"
                    iconColor={ResidentHomeColors.green}
                    iconBackground={ResidentHomeColors.greenSurface}
                    value={duesAmount === null ? '—' : formatCurrency(duesAmount)}
                    label={['Dues']}
                    onPress={onDuesPress}
                />
            </View>
        </View>
    );
}

function GlanceCard({ icon, iconColor, iconBackground, value, label, onPress }: GlanceCardProps) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.76} style={styles.glanceCard}>
            <View style={[styles.glanceIcon, { backgroundColor: iconBackground }]}>
                <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
            </View>
            <View style={styles.glanceCopy}>
                <Text style={styles.glanceValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                <Text style={styles.glanceLabel} numberOfLines={2}>{label.join('\n')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={ResidentHomeColors.tertiaryText} style={styles.glanceChevron} />
        </TouchableOpacity>
    );
}

export function WaitingAtGateSection({
    requests,
    isLoading,
    onAllow,
    onDecline,
    onViewAll,
}: {
    requests: EntryRequest[];
    isLoading: boolean;
    onAllow: (id: string) => void;
    onDecline: (id: string) => void;
    onViewAll: () => void;
}) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>WAITING AT GATE</Text>
                {requests.length > 0 && (
                    <View style={styles.liveLabel}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                    </View>
                )}
            </View>
            {isLoading && requests.length === 0 ? (
                <View style={[styles.waitingCard, styles.loadingCard]}>
                    <View style={styles.loadingCircle} />
                    <View style={styles.loadingCopy}><View style={styles.loadingLine} /><View style={styles.loadingLineShort} /></View>
                </View>
            ) : requests.length === 0 ? (
                <NoVisitorWaitingCard />
            ) : (
                requests.map((request, index) => (
                    <VisitorRequestCard
                        key={request.id}
                        request={request}
                        index={index}
                        onAllow={onAllow}
                        onDecline={onDecline}
                    />
                ))
            )}
            {requests.length > 0 && (
                <Pressable onPress={onViewAll} hitSlop={8} style={styles.inlineLink}>
                    <Text style={styles.inlineLinkText}>View all visitor requests</Text>
                </Pressable>
            )}
        </View>
    );
}

function VisitorRequestCard({ request, index, onAllow, onDecline }: {
    request: EntryRequest;
    index: number;
    onAllow: (id: string) => void;
    onDecline: (id: string) => void;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(220)} style={styles.waitingCard}>
            <Avatar name={request.visitorName} size={50} />
            <View style={styles.visitorCopy}>
                <Text style={styles.visitorName} numberOfLines={1}>{request.visitorName}</Text>
                <Text style={styles.visitorType}>{formatVisitorType(request.type)} • {request.gate ?? 'Gate 1'}</Text>
                <View style={styles.waitingTime}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color={ResidentHomeColors.danger} />
                    <Text style={styles.waitingTimeText}>Waiting {timeAgo(request.createdAt)}</Text>
                </View>
            </View>
            <View style={styles.visitorActions}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Decline visitor"
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecline(request.id); }}
                    activeOpacity={0.72}
                    style={styles.declineButton}
                >
                    <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Allow visitor"
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAllow(request.id); }}
                    activeOpacity={0.72}
                    style={styles.allowButton}
                >
                    <Text style={styles.allowText}>Allow</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

function NoVisitorWaitingCard() {
    return (
        <View style={styles.waitingCard}>
            <GateScene />
            <View style={styles.emptyGateCopy}>
                <Text style={styles.emptyGateTitle}>No visitors waiting right now</Text>
                <Text style={styles.emptyGateSubtitle}>You’ll see visitor requests here when someone arrives.</Text>
            </View>
        </View>
    );
}

function GateScene() {
    return (
        <View style={styles.gateScene}>
            <View style={styles.gateSun} />
            <View style={styles.gateCloud} />
            <View style={styles.gateRoof} />
            <View style={styles.gatePosts}>
                <View style={styles.gatePost} /><View style={styles.gatePost} />
                <View style={styles.gateBars} />
            </View>
            <View style={[styles.gateBush, styles.gateBushLeft]} /><View style={[styles.gateBush, styles.gateBushRight]} />
        </View>
    );
}

export function QuickActionsSection({ onAction }: { onAction: (route: string) => void }) {
    const actions = [
        { icon: 'account-check-outline' as const, label: 'Pre-Approve', route: 'MODAL:preapprove', color: '#E7A800', bg: '#FFF9E9' },
        { icon: 'card-account-details-outline' as const, label: 'My Passes', route: '/(resident)/my-passes', color: ResidentHomeColors.blue, bg: ResidentHomeColors.blueSurface },
        { icon: 'package-variant' as const, label: 'Delivery', route: 'MODAL:preapprove_delivery', color: ResidentHomeColors.violet, bg: ResidentHomeColors.violetSurface },
        { icon: 'account-wrench-outline' as const, label: 'Daily Help', route: '/(resident)/daily-help', color: ResidentHomeColors.green, bg: ResidentHomeColors.greenSurface },
    ];

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.standaloneHeading]}>QUICK ACTIONS</Text>
            <View style={styles.quickRow}>
                {actions.map((action) => (
                    <TouchableOpacity key={action.label} onPress={() => onAction(action.route)} activeOpacity={0.76} style={styles.quickCard}>
                        <View style={[styles.quickIcon, { backgroundColor: action.bg }]}>
                            <MaterialCommunityIcons name={action.icon} size={27} color={action.color} />
                        </View>
                        <Text style={styles.quickLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

export function AllServicesCard({ onPress }: { onPress: () => void }) {
    return (
        <View style={styles.section}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.76} style={styles.allServices}>
                <View style={styles.allServicesIcon}><MaterialCommunityIcons name="view-grid-outline" size={23} color="#555C70" /></View>
                <View style={styles.allServicesCopy}>
                    <Text style={styles.allServicesTitle}>All Services</Text>
                    <Text style={styles.allServicesSubtitle} numberOfLines={1}>Vehicles, Dues, Community and more</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={ResidentHomeColors.tertiaryText} />
            </TouchableOpacity>
        </View>
    );
}

export function SocietyUpdatesSection({ updates, onViewAll }: { updates: ResidentSocietyUpdate[]; onViewAll: () => void }) {
    return (
        <View style={styles.section}>
            <SectionHeading title="TODAY IN YOUR SOCIETY" onViewAll={onViewAll} />
            <View style={styles.updatesRow}>
                {updates.slice(0, 2).map((update) => {
                    const config = update.kind === 'delivery'
                        ? { icon: 'package-variant' as const, color: ResidentHomeColors.orange, bg: ResidentHomeColors.orangeSurface }
                        : update.kind === 'maintenance'
                            ? { icon: 'water-outline' as const, color: ResidentHomeColors.blue, bg: ResidentHomeColors.blueSurface }
                            : { icon: 'file-document-outline' as const, color: '#7256C8', bg: ResidentHomeColors.violetSurface };
                    return (
                        <TouchableOpacity key={update.id} onPress={onViewAll} activeOpacity={0.76} style={styles.updateCard}>
                            <View style={[styles.updateIcon, { backgroundColor: config.bg }]}>
                                <MaterialCommunityIcons name={config.icon} size={20} color={config.color} />
                            </View>
                            <View style={styles.updateCopy}>
                                <Text style={styles.updateTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.88}>{update.title}</Text>
                                <Text style={styles.updateSubtitle} numberOfLines={1}>{update.subtitle}</Text>
                                <Text style={styles.updateDetail} numberOfLines={1}>{update.detail}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={16} color={ResidentHomeColors.tertiaryText} style={styles.updateChevron} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function formatVisitorType(type: string) {
    return String(type || 'VISITOR').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function timeAgo(iso: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} hr`;
}

function formatCurrency(value: number) {
    return `₹${value.toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: ResidentHomeSpacing.gutter, marginBottom: ResidentHomeSpacing.base },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ResidentHomeSpacing.sm },
    sectionTitle: { fontSize: 12.5, lineHeight: 17, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.sectionText, letterSpacing: 1.15 },
    standaloneHeading: { marginBottom: ResidentHomeSpacing.sm },
    viewAll: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    viewAllText: { fontSize: 11.5, fontFamily: SgateFonts.regular, color: ResidentHomeColors.secondaryText },
    hero: { height: 122, marginHorizontal: ResidentHomeSpacing.gutter, marginBottom: ResidentHomeSpacing.lg, borderRadius: ResidentHomeRadius.hero, overflow: 'hidden', backgroundColor: ResidentHomeColors.hero, flexDirection: 'row', position: 'relative' },
    heroCopy: { flex: 1, zIndex: 2, paddingLeft: ResidentHomeSpacing.lg, paddingRight: ResidentHomeSpacing.base, paddingTop: ResidentHomeSpacing.base, paddingBottom: ResidentHomeSpacing.md, justifyContent: 'flex-start' },
    greeting: { fontSize: 13.5, lineHeight: 19, fontFamily: SgateFonts.regular, color: ResidentHomeColors.primaryText },
    wave: { fontSize: 16 },
    heroTitle: { fontSize: 20, lineHeight: 25, marginTop: ResidentHomeSpacing.xxs, fontFamily: SgateFonts.bold, color: ResidentHomeColors.primaryText, letterSpacing: -0.55 },
    statusPill: { alignSelf: 'flex-start', marginTop: ResidentHomeSpacing.xs, minHeight: 30, borderRadius: ResidentHomeRadius.full, paddingLeft: ResidentHomeSpacing.xxs, paddingRight: ResidentHomeSpacing.sm, backgroundColor: ResidentHomeColors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: ResidentHomeColors.success, alignItems: 'center', justifyContent: 'center' },
    statusText: { fontSize: 10, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.successText },
    scene: { width: 146, height: '100%', position: 'absolute', right: 8, bottom: 0, overflow: 'hidden', opacity: 0.9 },
    sun: { position: 'absolute', top: 14, left: 58, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFC43D' },
    buildingGroup: { position: 'absolute', left: 24, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
    building: { backgroundColor: '#FFF1DC', borderColor: '#EBC38F', borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, padding: 6 },
    mainBuilding: { width: 47, height: 82 },
    sideBuilding: { width: 32, height: 58 },
    windowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    window: { width: 7, height: 9, borderRadius: 2, backgroundColor: '#D99143', opacity: 0.65 },
    door: { position: 'absolute', bottom: 0, left: 16, width: 15, height: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#E2A65B' },
    tree: { position: 'absolute', bottom: 7, width: 18, height: 27, borderRadius: 11, backgroundColor: '#92C85F' },
    treeLeft: { left: 10 },
    treeRight: { right: 13 },
    ground: { position: 'absolute', left: 16, right: 0, bottom: 0, height: 7, borderRadius: 7, backgroundColor: '#E3B53F' },
    glanceRow: { flexDirection: 'row', gap: ResidentHomeSpacing.xs },
    glanceCard: { flex: 1, minWidth: 0, height: 68, borderRadius: ResidentHomeRadius.card, paddingLeft: ResidentHomeSpacing.xs, paddingRight: 18, paddingVertical: ResidentHomeSpacing.xs, backgroundColor: ResidentHomeColors.card, borderWidth: 1, borderColor: ResidentHomeColors.border, flexDirection: 'row', alignItems: 'center', gap: ResidentHomeSpacing.xxs, position: 'relative' },
    glanceIcon: { width: 38, height: 38, borderRadius: ResidentHomeRadius.icon, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    glanceCopy: { flex: 1, minWidth: 0, justifyContent: 'center' },
    glanceValue: { fontSize: 17, lineHeight: 20, fontFamily: SgateFonts.bold, color: ResidentHomeColors.primaryText },
    glanceLabel: { marginTop: 1, fontSize: 9, lineHeight: 11.5, fontFamily: SgateFonts.regular, color: ResidentHomeColors.secondaryText },
    glanceChevron: { position: 'absolute', right: 3, top: 25 },
    liveLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    liveDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#10C979' },
    liveText: { fontSize: 12, fontFamily: SgateFonts.medium, color: ResidentHomeColors.green },
    waitingCard: { minHeight: 78, borderRadius: ResidentHomeRadius.largeCard, paddingHorizontal: ResidentHomeSpacing.md, paddingVertical: ResidentHomeSpacing.xs, backgroundColor: ResidentHomeColors.card, borderWidth: 1, borderColor: ResidentHomeColors.border, flexDirection: 'row', alignItems: 'center', gap: ResidentHomeSpacing.sm },
    loadingCard: { paddingHorizontal: 20 },
    loadingCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0F1F4' },
    loadingCopy: { flex: 1, gap: 10 },
    loadingLine: { height: 15, width: '62%', borderRadius: 8, backgroundColor: '#F0F1F4' },
    loadingLineShort: { height: 12, width: '42%', borderRadius: 8, backgroundColor: '#F0F1F4' },
    visitorCopy: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' },
    visitorName: { fontSize: 14, lineHeight: 19, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    visitorType: { marginTop: 2, fontSize: 11, lineHeight: 16, fontFamily: SgateFonts.regular, color: ResidentHomeColors.tertiaryText },
    waitingTime: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    waitingTimeText: { fontSize: 10.5, fontFamily: SgateFonts.medium, color: ResidentHomeColors.danger },
    visitorActions: { gap: 6, flexDirection: 'row', alignItems: 'center' },
    declineButton: { minWidth: 69, height: 40, borderRadius: 13, borderWidth: 1, borderColor: '#E5E6EA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
    allowButton: { minWidth: 69, height: 40, borderRadius: 13, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
    declineText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.danger },
    allowText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    inlineLink: { alignSelf: 'center', marginTop: 10 },
    inlineLinkText: { fontSize: 12, fontFamily: SgateFonts.medium, color: '#777D9B' },
    gateScene: { width: 82, height: 56, position: 'relative', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 },
    gateSun: { position: 'absolute', top: 0, left: 26, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF8EA' },
    gateCloud: { position: 'absolute', top: 18, left: 5, width: 25, height: 8, borderRadius: 7, backgroundColor: '#EAF1F8' },
    gateRoof: { position: 'absolute', top: 30, left: 24, width: 42, height: 4, backgroundColor: '#A8B1C5', borderRadius: 4 },
    gatePosts: { width: 59, height: 36, borderLeftWidth: 4, borderRightWidth: 4, borderColor: '#A8B1C5', alignItems: 'center', justifyContent: 'center' },
    gatePost: { position: 'absolute', bottom: 0, width: 5, height: 37, backgroundColor: '#A8B1C5', borderRadius: 2 },
    gateBars: { width: 41, height: 26, borderWidth: 3, borderTopWidth: 0, borderColor: '#7C879E' },
    gateBush: { position: 'absolute', bottom: 1, width: 18, height: 18, borderRadius: 10, backgroundColor: '#8CCB74' },
    gateBushLeft: { left: 8 },
    gateBushRight: { right: 6 },
    emptyGateCopy: { flex: 1, minWidth: 0, paddingRight: 5 },
    emptyGateTitle: { fontSize: 12.5, lineHeight: 17, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    emptyGateSubtitle: { marginTop: ResidentHomeSpacing.xxs, fontSize: 10.5, lineHeight: 15, fontFamily: SgateFonts.regular, color: ResidentHomeColors.secondaryText },
    quickRow: { flexDirection: 'row', gap: ResidentHomeSpacing.xs },
    quickCard: { flex: 1, minWidth: 0, height: 76, borderRadius: ResidentHomeRadius.card, paddingHorizontal: 4, paddingVertical: ResidentHomeSpacing.xs, backgroundColor: ResidentHomeColors.card, borderWidth: 1, borderColor: ResidentHomeColors.border, alignItems: 'center', justifyContent: 'center' },
    quickIcon: { width: 40, height: 40, borderRadius: ResidentHomeRadius.icon, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { marginTop: 5, textAlign: 'center', fontSize: 9.5, lineHeight: 12, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    allServices: { height: 56, borderRadius: ResidentHomeRadius.largeCard, paddingHorizontal: ResidentHomeSpacing.md, backgroundColor: ResidentHomeColors.card, borderWidth: 1, borderColor: ResidentHomeColors.border, flexDirection: 'row', alignItems: 'center', gap: ResidentHomeSpacing.sm },
    allServicesIcon: { width: 40, height: 40, borderRadius: ResidentHomeRadius.icon, backgroundColor: ResidentHomeColors.neutralSurface, alignItems: 'center', justifyContent: 'center' },
    allServicesCopy: { flex: 1, minWidth: 0 },
    allServicesTitle: { fontSize: 13, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    allServicesSubtitle: { marginTop: 1, fontSize: 10, fontFamily: SgateFonts.regular, color: ResidentHomeColors.secondaryText },
    updatesRow: { flexDirection: 'row', gap: ResidentHomeSpacing.xs },
    updateCard: { flex: 1, minWidth: 0, height: 88, borderRadius: ResidentHomeRadius.card, paddingLeft: ResidentHomeSpacing.xs, paddingRight: 20, backgroundColor: ResidentHomeColors.card, borderWidth: 1, borderColor: ResidentHomeColors.border, flexDirection: 'row', alignItems: 'center', gap: 7, position: 'relative' },
    updateIcon: { width: 40, height: 40, borderRadius: ResidentHomeRadius.icon, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    updateCopy: { flex: 1, minWidth: 0 },
    updateTitle: { fontSize: 10, lineHeight: 13.5, fontFamily: SgateFonts.semibold, color: ResidentHomeColors.primaryText },
    updateSubtitle: { marginTop: 2, fontSize: 8.5, lineHeight: 11.5, fontFamily: SgateFonts.regular, color: ResidentHomeColors.secondaryText },
    updateDetail: { marginTop: 1, fontSize: 8.5, lineHeight: 11.5, fontFamily: SgateFonts.regular, color: ResidentHomeColors.tertiaryText },
    updateChevron: { position: 'absolute', right: 3, top: 36 },
});
