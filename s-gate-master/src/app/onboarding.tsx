import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_SEEN_KEY = 'onboarding_seen';

// ── Official logo ──────────────────────────────────────────────────────────────
const SGATE_LOGO = require('../../assets/images/icons/s-gate-logo-without-bg.png');

// ── Slide data ─────────────────────────────────────────────────────────────────
interface Slide {
    title: string;
    subtitle: string;
    icon: keyof typeof Feather.glyphMap;
    accent: string;
    accentBg: string;
}

const SLIDES: Slide[] = [
    {
        title: 'Secure Every\nEntry Point',
        subtitle: 'Know who enters your society — visitors, deliveries, and services. All verified in real-time.',
        icon: 'shield',
        accent: SgateColors.gold,
        accentBg: '#FFF8E1',
    },
    {
        title: 'One-Tap\nApprovals',
        subtitle: 'Pre-approve visitors, generate QR passes, and manage deliveries right from your phone.',
        icon: 'check-circle',
        accent: SgateColors.gold,
        accentBg: SgateColors.greenBg,
    },
    {
        title: 'Your Society,\nSmarter',
        subtitle: 'Connect with residents, track activity, and keep your community safe — together.',
        icon: 'users',
        accent: SgateColors.gold,
        accentBg: SgateColors.blueBg,
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const btnScale = useSharedValue(1);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        } else {
            await markOnboardingSeen();
            router.replace('/login');
        }
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await markOnboardingSeen();
        router.replace('/login');
    };

    const markOnboardingSeen = async () => {
        try {
            await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, 'true');
        } catch {}
    };

    const btnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    const isLastSlide = activeIndex === SLIDES.length - 1;
    const currentSlide = SLIDES[activeIndex];

    const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
        <View style={styles.slide}>
            {/* Logo area */}
            <View style={styles.logoArea}>
                {/* Soft ambient circle */}
                <View style={[styles.ambientCircle, { backgroundColor: item.accentBg }]} />

                {/* Logo container with ring */}
                <View style={[styles.logoRing, { borderColor: item.accent + '20' }]}>
                    <Image source={SGATE_LOGO} style={styles.logo} resizeMode="contain" />
                </View>

                {/* Feature icon chip */}
                <View style={[styles.featureChip, { backgroundColor: item.accent + '15' }]}>
                    <Feather name={item.icon} size={16} color={item.accent} />
                </View>
            </View>

            {/* Text content */}
            <View style={styles.textArea}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSub}>{item.subtitle}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            {/* Top bar */}
            <Animated.View
                entering={FadeInUp.delay(50).springify()}
                style={[styles.topBar, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.brandPill}>
                    <View style={styles.brandDot} />
                    <Text style={styles.brandLabel}>S-GATE</Text>
                </View>

                {activeIndex < SLIDES.length - 1 && (
                    <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Slides */}
            <View style={styles.slidesContainer}>
                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    bounces={false}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                />
            </View>

            {/* Bottom section */}
            <Animated.View
                entering={FadeInDown.delay(200).springify()}
                style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}
            >
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((slide, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    width: activeIndex === i ? 24 : 8,
                                    backgroundColor: activeIndex === i
                                        ? currentSlide.accent
                                        : SgateColors.border,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* CTA Button */}
                <Animated.View style={btnAnimStyle}>
                    <TouchableOpacity
                        onPress={handleNext}
                        onPressIn={() => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
                        onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                        activeOpacity={0.9}
                        style={[styles.ctaBtn, { backgroundColor: currentSlide.accent }]}
                    >
                        <Text style={[
                            styles.ctaBtnText,
                            { color: currentSlide.accent === SgateColors.gold ? SgateColors.t1 : '#FFFFFF' },
                        ]}>
                            {isLastSlide ? 'Get Started' : 'Continue'}
                        </Text>
                        <Feather
                            name={isLastSlide ? 'log-in' : 'arrow-right'}
                            size={18}
                            color={currentSlide.accent === SgateColors.gold ? SgateColors.t1 : '#FFFFFF'}
                        />
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // ── Top bar ──────────────────────────────────────────────────────
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    brandPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    brandDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SgateColors.gold,
    },
    brandLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: 3,
    },
    skipText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },

    // ── Slides ───────────────────────────────────────────────────────
    slidesContainer: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },

    // ── Logo area ────────────────────────────────────────────────────
    logoArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    ambientCircle: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    logoRing: {
        width: 144,
        height: 144,
        borderRadius: 72,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        // Soft shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    logo: {
        width: 88,
        height: 88,
    },
    featureChip: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },

    // ── Text ─────────────────────────────────────────────────────────
    textArea: {
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 30,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        textAlign: 'center',
        lineHeight: 38,
        letterSpacing: -1,
        marginBottom: 14,
    },
    slideSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 300,
    },

    // ── Bottom section ───────────────────────────────────────────────
    bottomSection: {
        paddingHorizontal: 24,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    ctaBtn: {
        borderRadius: 16,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        // Minimal shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    ctaBtnText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
    },
});
