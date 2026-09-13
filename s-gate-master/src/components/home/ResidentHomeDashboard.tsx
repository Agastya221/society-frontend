import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SgateColors } from '@/constants/Sgate-theme';
import type { EntryRequest, User } from '@/types/api';
import ResidentHomeHeader from './ResidentHomeHeader';
import { ResidentHomeColors, ResidentHomeSpacing } from './ResidentHomeTheme';
import {
    AllServicesCard,
    AtAGlanceSection,
    QuickActionsSection,
    ResidentSocietyUpdate,
    SocietyStatusCard,
    SocietyUpdatesSection,
    WaitingAtGateSection,
} from './ResidentHomeWidgets';

interface ResidentHomeDashboardProps {
    user: User | null;
    towerName: string;
    societyName: string;
    notificationCount: number;
    canOpenContextSheet: boolean;
    pendingRequests: EntryRequest[];
    gateLoading: boolean;
    deliveryCount: number | null;
    duesAmount: number | null;
    updates: ResidentSocietyUpdate[];
    refreshing: boolean;
    onRefresh: () => void;
    onContextPress: () => void;
    onNotificationPress: () => void;
    onSosPress: () => void;
    onNavigate: (route: string) => void;
    onAllow: (id: string) => void;
    onDecline: (id: string) => void;
}

export default function ResidentHomeDashboard({
    user,
    towerName,
    societyName,
    notificationCount,
    canOpenContextSheet,
    pendingRequests,
    gateLoading,
    deliveryCount,
    duesAmount,
    updates,
    refreshing,
    onRefresh,
    onContextPress,
    onNotificationPress,
    onSosPress,
    onNavigate,
    onAllow,
    onDecline,
}: ResidentHomeDashboardProps) {
    const displayedUpdates = [
        ...updates,
        { id: 'empty-notice', title: 'No new society updates', subtitle: 'You’re all caught up', detail: 'Check back later', kind: 'notice' as const },
        { id: 'empty-delivery', title: 'No deliveries planned', subtitle: 'Nothing expected today', detail: 'You’re all clear', kind: 'delivery' as const },
    ].slice(0, 2);

    return (
        <View style={styles.root}>
            <ResidentHomeHeader
                towerName={towerName}
                societyName={societyName}
                notificationCount={notificationCount}
                canOpenContextSheet={canOpenContextSheet}
                onContextPress={onContextPress}
                onNotificationPress={onNotificationPress}
                onSosPress={onSosPress}
            />
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={SgateColors.gold}
                        colors={[SgateColors.gold]}
                    />
                }
            >
                <SocietyStatusCard residentName={getFirstName(user?.name)} />
                <AtAGlanceSection
                    waitingCount={pendingRequests.length}
                    deliveryCount={deliveryCount}
                    duesAmount={duesAmount}
                    onVisitorsPress={() => onNavigate('/(resident)/approvals')}
                    onDeliveryPress={() => onNavigate('/(resident)/deliveries')}
                    onDuesPress={() => onNavigate('/(resident)/society-dues')}
                />
                <WaitingAtGateSection
                    requests={pendingRequests}
                    isLoading={gateLoading}
                    onAllow={onAllow}
                    onDecline={onDecline}
                    onViewAll={() => onNavigate('/(resident)/approvals')}
                />
                <QuickActionsSection onAction={onNavigate} />
                <AllServicesCard onPress={() => onNavigate('/(resident)/all-tools')} />
                <SocietyUpdatesSection
                    updates={displayedUpdates}
                    onViewAll={() => onNavigate('/(resident)/society')}
                />
            </ScrollView>
        </View>
    );
}

function getFirstName(name?: string | null) {
    return name?.trim().split(/\s+/)[0] || 'Resident';
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: ResidentHomeColors.page },
    scroll: { flex: 1, backgroundColor: ResidentHomeColors.page },
    content: { paddingTop: ResidentHomeSpacing.xs, paddingBottom: ResidentHomeSpacing.xl },
});
