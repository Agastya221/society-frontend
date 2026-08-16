import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import { getSectionsForRole, getToolsForSection, type ToolRole, type ToolItem } from './toolsConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SharedToolsScreenProps {
    role: ToolRole;
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onPress }: { tool: ToolItem; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: tool.bg }]}>
                <MaterialCommunityIcons name={tool.icon} size={26} color={tool.color} />
            </View>
            <Text
                style={styles.tileTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
            >
                {tool.label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharedToolsScreen({ role }: SharedToolsScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [preApproveConfig, setPreApproveConfig] = useState<{ visible: boolean; type?: 'GUEST' | 'CAB' | 'DELIVERY' | 'SERVICE' }>({ visible: false });

    const sections = getSectionsForRole(role);

    const handleToolPress = (tool: ToolItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (tool.route.startsWith('MODAL:')) {
            const modalId = tool.route.split(':')[1];
            if (modalId === 'preapprove') {
                setPreApproveConfig({ visible: true });
            } else if (modalId === 'preapprove_delivery') {
                setPreApproveConfig({ visible: true, type: 'DELIVERY' });
            }
            return;
        }

        router.push(tool.route as any);
    };

    return (
        <View style={styles.root}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>All Tools</Text>
                </View>
            </View>

            {/* ── Content ─────────────────────────────────────────────── */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {sections.map(section => {
                    const tools = getToolsForSection(role, section.id);
                    if (tools.length === 0) return null;

                    return (
                        <View key={section.id}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.grid}>
                                {tools.map(tool => (
                                    <ToolCard
                                        key={tool.id}
                                        tool={tool}
                                        onPress={() => handleToolPress(tool)}
                                    />
                                ))}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* ── Pre-Approve Modal ────────────────────────────────────── */}
            <PreApproveSheet
                visible={preApproveConfig.visible}
                initialType={preApproveConfig.type as any}
                onClose={() => setPreApproveConfig({ visible: false })}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },

    // Header
    headerBar: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 13,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginLeft: 12,
    },

    // Scroll
    scrollContent: {
        padding: 20,
        paddingBottom: 60,
    },

    // Sections
    sectionTitle: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1,
        marginBottom: 16,
        marginTop: 8,
    },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        columnGap: '2%' as any,
        rowGap: 12,
        marginBottom: 20,
    },

    // Tool card
    tile: {
        width: '32%' as any,
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 10,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 104,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    tileTitle: {
        fontSize: 11,
        lineHeight: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        textAlign: 'center',
    },
});
