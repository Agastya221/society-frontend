import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import type { ResidentType } from '@/types/onboarding.types';

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({
    icon,
    title,
    subtitle,
    description,
    isSelected,
    onPress,
    delay = 0,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    description: string;
    isSelected: boolean;
    onPress: () => void;
    delay?: number;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={{ flex: 1 }}
        >
            <Animated.View style={[animStyle, { flex: 1 }]}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 400 }); }}
                    onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                    activeOpacity={0.9}
                    style={[styles.roleCard, isSelected && styles.roleCardActive]}
                >
                    {/* Selection indicator */}
                    {isSelected && (
                        <View style={styles.roleCheckBadge}>
                            <Feather name="check" size={12} color="#FFFFFF" />
                        </View>
                    )}

                    {/* Icon */}
                    <View style={[styles.roleIconContainer, isSelected && styles.roleIconContainerActive]}>
                        <View style={[styles.roleIconCircle, isSelected && styles.roleIconCircleActive]}>
                            {icon}
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.roleTitle, isSelected && styles.roleTitleActive]}>
                        {title}
                    </Text>

                    {/* Subtitle */}
                    <Text style={styles.roleSubtitle}>{subtitle}</Text>

                    {/* Description tag */}
                    <View style={[styles.roleTag, isSelected && styles.roleTagActive]}>
                        <Text style={[styles.roleTagText, isSelected && styles.roleTagTextActive]}>
                            {description}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

// ─── Living Option Card ───────────────────────────────────────────────────────

function LivingOptionCard({
    icon,
    title,
    subtitle,
    isSelected,
    onPress,
    delay = 0,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    isSelected: boolean;
    onPress: () => void;
    delay?: number;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
        >
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
                    onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                    activeOpacity={0.85}
                    style={[styles.livingCard, isSelected && styles.livingCardActive]}
                >
                    <View style={[styles.livingIconBox, isSelected && styles.livingIconBoxActive]}>
                        {icon}
                    </View>
                    <View style={styles.livingContent}>
                        <Text style={[styles.livingTitle, isSelected && styles.livingTitleActive]}>
                            {title}
                        </Text>
                        <Text style={styles.livingSubtitle}>{subtitle}</Text>
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ResidentTypeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const selectedFlat = useOnboardingStore((s) => s.selectedFlat);
    const residentType = useOnboardingStore((s) => s.residentType);
    const isLivingHere = useOnboardingStore((s) => s.isLivingHere);
    const setResidentType = useOnboardingStore((s) => s.setResidentType);
    const setIsLivingHere = useOnboardingStore((s) => s.setIsLivingHere);

    const handleTypeSelect = useCallback(
        (type: ResidentType) => {
            setResidentType(type);
        },
        [setResidentType]
    );

    const canContinue =
        residentType === 'TENANT' ||
        (residentType === 'OWNER' && isLivingHere !== null);

    const handleContinue = () => {
        if (!canContinue) return;
        router.push('/(onboarding)/document-upload');
    };

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Who are you?"
                subtitle={`Flat ${selectedFlat?.flatNumber || ''}`}
                step={5}
                stepLabel="Resident Type"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 88 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Section Header */}
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                    <Text style={styles.sectionTitle}>
                        Select your relationship
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        How are you associated with this flat?
                    </Text>
                </Animated.View>

                {/* Owner / Tenant Cards */}
                <View style={styles.cardsRow}>
                    <RoleCard
                        icon={
                            <MaterialCommunityIcons
                                name="shield-key"
                                size={28}
                                color={residentType === 'OWNER' ? SgateColors.gold : SgateColors.t3}
                            />
                        }
                        title="Owner"
                        subtitle="I own this flat"
                        description="Property holder"
                        isSelected={residentType === 'OWNER'}
                        onPress={() => handleTypeSelect('OWNER')}
                        delay={100}
                    />
                    <RoleCard
                        icon={
                            <MaterialCommunityIcons
                                name="account-key"
                                size={28}
                                color={residentType === 'TENANT' ? SgateColors.gold : SgateColors.t3}
                            />
                        }
                        title="Tenant"
                        subtitle="I'm renting this flat"
                        description="Rental occupant"
                        isSelected={residentType === 'TENANT'}
                        onPress={() => handleTypeSelect('TENANT')}
                        delay={180}
                    />
                </View>

                {/* Owner Sub-question */}
                {residentType === 'OWNER' && (
                    <Animated.View entering={FadeInDown.springify()}>
                        <View style={styles.subSection}>
                            {/* Decorative connector */}
                            <View style={styles.connector}>
                                <View style={styles.connectorLine} />
                                <View style={styles.connectorDot} />
                            </View>

                            <View style={styles.subSectionCard}>
                                <Text style={styles.subSectionTitle}>
                                    Are you living in this flat?
                                </Text>
                                <Text style={styles.subSectionSubtitle}>
                                    This helps us set up your access accordingly
                                </Text>

                                <View style={styles.livingOptions}>
                                    <LivingOptionCard
                                        icon={
                                            <MaterialCommunityIcons
                                                name="home-account"
                                                size={22}
                                                color={isLivingHere === true ? SgateColors.gold : SgateColors.t3}
                                            />
                                        }
                                        title="Yes, I live here"
                                        subtitle="Residing owner"
                                        isSelected={isLivingHere === true}
                                        onPress={() => setIsLivingHere(true)}
                                        delay={50}
                                    />
                                    <LivingOptionCard
                                        icon={
                                            <MaterialCommunityIcons
                                                name="home-city-outline"
                                                size={22}
                                                color={isLivingHere === false ? SgateColors.gold : SgateColors.t3}
                                            />
                                        }
                                        title="No, non-residing owner"
                                        subtitle="Remote property owner"
                                        isSelected={isLivingHere === false}
                                        onPress={() => setIsLivingHere(false)}
                                        delay={120}
                                    />
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Continue Button */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!canContinue}
                    style={[styles.continueBtn, canContinue && styles.continueBtnActive]}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.continueBtnText,
                            canContinue && styles.continueBtnTextActive,
                        ]}
                    >
                        Continue
                    </Text>
                    {canContinue && (
                        <Feather name="arrow-right" size={18} color={SgateColors.t1} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 16,
    },

    // ── Section Header ──
    sectionTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 20,
    },

    // ── Role Cards ──
    cardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    roleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: SgateColors.border,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        position: 'relative',
        ...SgateShadows.minimal,
    },
    roleCardActive: {
        borderColor: SgateColors.gold,
        backgroundColor: '#FFFCF0',
        ...SgateShadows.card,
    },
    roleCheckBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        ...SgateShadows.minimal,
    },
    roleIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 22,
        backgroundColor: SgateColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    roleIconContainerActive: {
        backgroundColor: SgateColors.goldPale,
    },
    roleIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    roleIconCircleActive: {
        borderColor: '#FFE8A0',
        backgroundColor: '#FFFFFF',
    },
    roleTitle: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    roleTitleActive: {
        color: SgateColors.t1,
    },
    roleSubtitle: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        marginBottom: 12,
    },
    roleTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: SgateColors.surface,
    },
    roleTagActive: {
        backgroundColor: SgateColors.goldPale,
    },
    roleTagText: {
        fontSize: 10,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleTagTextActive: {
        color: SgateColors.goldDeep,
    },

    // ── Sub-section ──
    subSection: {
        marginTop: 4,
    },
    connector: {
        alignItems: 'center',
        height: 24,
    },
    connectorLine: {
        width: 2,
        flex: 1,
        backgroundColor: SgateColors.gold,
        opacity: 0.3,
    },
    connectorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SgateColors.gold,
        opacity: 0.4,
    },
    subSectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        ...SgateShadows.card,
    },
    subSectionTitle: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    subSectionSubtitle: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 18,
    },
    livingOptions: {
        gap: 10,
    },

    // ── Living Option Cards ──
    livingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        backgroundColor: '#FFFFFF',
    },
    livingCardActive: {
        borderColor: SgateColors.gold,
        backgroundColor: '#FFFCF0',
    },
    livingIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: SgateColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    livingIconBoxActive: {
        backgroundColor: SgateColors.goldPale,
    },
    livingContent: {
        flex: 1,
    },
    livingTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    livingTitleActive: {
        fontFamily: SgateFonts.bold,
    },
    livingSubtitle: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterActive: {
        borderColor: SgateColors.gold,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: SgateColors.gold,
    },

    // ── Bottom ──
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingHorizontal: 20,
        paddingTop: 12,
        ...SgateShadows.card,
    },
    continueBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: SgateColors.surface,
    },
    continueBtnActive: {
        backgroundColor: SgateColors.gold,
    },
    continueBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t4,
    },
    continueBtnTextActive: {
        color: SgateColors.t1,
    },
});
