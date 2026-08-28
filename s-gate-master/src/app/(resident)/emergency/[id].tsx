import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SgateColors, SgateFonts, SgateLayout, SgateRadius, SgateSurfaces } from '../../../constants/Sgate-theme';
import { EmergencyResponse, getEmergencyById } from '../../../services/emergency';

const TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function EmergencyDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [emergency, setEmergency] = useState<EmergencyResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadEmergency(id as string);
        }
    }, [id]);

    const loadEmergency = async (emergencyId: string) => {
        try {
            const data = await getEmergencyById(emergencyId);
            setEmergency(data);
        } catch (error) {
            console.error('Failed to load emergency details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={S.center}>
                <AppLoader />
            </View>
        );
    }

    if (!emergency) {
        return (
            <View style={S.center}>
                <View style={S.emptyIcon}><Ionicons name="alert-circle-outline" size={30} color={SgateColors.t3} /></View>
                <Text style={S.emptyTitle}>Alert not found</Text>
                <Text style={S.emptyText}>This alert may have been removed or is no longer available.</Text>
                <Pressable onPress={() => router.back()} style={S.backAction} accessibilityRole="button">
                    <Text style={S.backActionText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={S.root}>
            <ScreenHeader title="Alert Details" subtitle="Emergency response status" />
            <View style={S.headerGap} />

            <ScrollView
                style={S.flex}
                contentContainerStyle={[S.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Card */}
                <View style={S.heroCard}>
                    <View style={S.heroHeader}>
                        <View style={S.alertIcon}>
                                <Ionicons name={
                                    emergency.type === 'MEDICAL' ? 'medkit' :
                                    emergency.type === 'FIRE' ? 'flame' :
                                    'warning'
                                } size={25} color="#FFFFFF" />
                        </View>
                        <View style={S.heroCopy}>
                                <Text style={S.heroTitle} numberOfLines={2}>
                                    {emergency.type.replace('_', ' ')}
                                </Text>
                                <Text style={S.heroLabel}>TYPE OF ALERT</Text>
                        </View>
                    </View>
                    
                    <View style={S.descriptionBox}>
                      <Text style={S.descriptionText}>
                          {emergency.description || 'Instantly reported to gate security and emergency response teams.'}
                      </Text>
                    </View>
                </View>

                {/* Timeline / Updates */}
                <Text style={S.sectionLabel}>ALERT TIMELINE</Text>

                <View style={S.timeline}>
                    {/* Created Step */}
                    <View style={S.timelineItem}>
                        <View style={[S.timelineDot, { backgroundColor: SgateColors.red }]} />
                        <View style={S.timelineTitleRow}>
                          <Text style={S.timelineTitle}>Alert Raised</Text>
                          <Text style={S.timelineTime}>{TIME_FORMATTER.format(new Date(emergency.createdAt))}</Text>
                        </View>
                        <Text style={S.timelineMeta}>
                            Sent from flat {emergency.sender.flat}
                        </Text>
                    </View>

                    {/* Response Step */}
                    {emergency.respondedBy ? (
                        <View style={S.timelineItem}>
                            <View style={[S.timelineDot, { backgroundColor: SgateColors.blue }]} />
                            <View style={S.timelineTitleRow}>
                              <Text style={S.timelineTitle}>Security Acknowledged</Text>
                              <Text style={[S.timelineTime, { color: SgateColors.blue }]}>ACTIVE</Text>
                            </View>
                            <Text style={S.timelineMeta}>
                                Assigned to {emergency.respondedBy.name} ({emergency.respondedBy.role})
                            </Text>
                            {emergency.responseNote && (
                                <View style={[S.noteBox, { backgroundColor: SgateColors.blueBg }]}>
                                    <Text style={S.noteText}>“{emergency.responseNote}”</Text>
                                </View>
                            )}
                        </View>
                    ): (
                        <View style={[S.timelineItem, { opacity: 0.55 }]}>
                            <View style={[S.timelineDot, { backgroundColor: SgateColors.border }]} />
                            <Text style={S.timelineTitle}>Awaiting Security…</Text>
                        </View>
                    )}

                    {/* Resolution Step */}
                    {(emergency.status === 'RESOLVED' || emergency.status === 'FALSE_ALARM') ? (
                        <View style={S.timelineItem}>
                            <View style={[S.timelineDot, { backgroundColor: emergency.status === 'FALSE_ALARM' ? SgateColors.goldDeep : SgateColors.green }]} />
                            <View style={S.timelineTitleRow}>
                              <Text style={S.timelineTitle}>
                                  {emergency.status === 'FALSE_ALARM' ? 'Closed (False Alarm)' : 'Resolved'}
                              </Text>
                              {emergency.resolvedAt && (
                                <Text style={S.timelineTime}>{TIME_FORMATTER.format(new Date(emergency.resolvedAt))}</Text>
                              )}
                            </View>
                            {emergency.resolutionNote && (
                                <View style={[S.noteBox, { backgroundColor: emergency.status === 'FALSE_ALARM' ? SgateColors.goldPale : SgateColors.greenBg }]}>
                                    <Text style={S.noteText}>“{emergency.resolutionNote}”</Text>
                                </View>
                            )}
                        </View>
                    ) : null}
                </View>

            </ScrollView>
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    flex: { flex: 1 },
    headerGap: { height: SgateLayout.headerContentGap },
    content: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12 },
    center: { flex: 1, padding: 24, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },
    emptyIcon: { width: 64, height: 64, marginBottom: 14, borderRadius: 32, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    emptyText: { maxWidth: 300, marginTop: 6, fontSize: 13, lineHeight: 19, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },
    backAction: { minHeight: 44, marginTop: 18, paddingHorizontal: 20, borderRadius: SgateRadius.sm, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
    backActionText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    heroCard: { padding: 18, marginBottom: 24, borderRadius: SgateRadius.lg, borderWidth: 1, borderColor: '#FFD5D5', backgroundColor: SgateColors.redBg },
    heroHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    alertIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: SgateColors.red, alignItems: 'center', justifyContent: 'center' },
    heroCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
    heroTitle: { fontSize: 19, fontFamily: SgateFonts.bold, color: SgateColors.t1, textTransform: 'capitalize' },
    heroLabel: { marginTop: 3, fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.red, letterSpacing: 0.8 },
    descriptionBox: { ...SgateSurfaces.card, padding: 14, backgroundColor: 'rgba(255,255,255,0.72)' },
    descriptionText: { fontSize: 14, lineHeight: 21, fontFamily: SgateFonts.regular, color: SgateColors.t2 },
    sectionLabel: { marginBottom: 16, fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 1 },
    timeline: { marginLeft: 9, paddingLeft: 25, borderLeftWidth: 1, borderLeftColor: SgateColors.border },
    timelineItem: { position: 'relative', minHeight: 74, marginBottom: 20 },
    timelineDot: { position: 'absolute', top: 3, left: -31, width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: SgateColors.card },
    timelineTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    timelineTitle: { flex: 1, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    timelineTime: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
    timelineMeta: { marginTop: 5, fontSize: 12, lineHeight: 18, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    noteBox: { marginTop: 10, padding: 12, borderRadius: SgateRadius.sm },
    noteText: { fontSize: 12, lineHeight: 18, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
});
