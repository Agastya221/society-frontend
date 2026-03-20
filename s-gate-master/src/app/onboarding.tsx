import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { SgateMascot, MascotPose } from '@/components/Sgate/SgateMascot';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_SEEN_KEY = 'onboarding_seen';

interface Slide {
    title: string;
    subtitle: string;
    pose: MascotPose;
    accent: string;
}

const SLIDES: Slide[] = [
    {
        title: 'Secure Every\nEntry Point',
        subtitle: 'Know who enters your society — visitors, deliveries, and services. All verified in real-time.',
        pose: 'wave',
        accent: SgateColors.gold,
    },
    {
        title: 'One-Tap\nApprovals',
        subtitle: 'Pre-approve visitors, generate QR passes, and manage deliveries from your phone.',
        pose: 'thumbsup',
        accent: SgateColors.green,
    },
    {
        title: 'Your Society,\nSmarter',
        subtitle: 'Connect with residents, track activity, and keep your community safe together.',
        pose: 'wink',
        accent: SgateColors.blue,
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

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

    const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
        <View style={styles.slide}>
            {/* Glow behind mascot */}
            <View
                style={[
                    styles.glow,
                    { backgroundColor: item.accent + '12' },
                ]}
            />

            <View style={styles.mascotWrap}>
                <SgateMascot size={120} pose={item.pose} />
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSub}>{item.subtitle}</Text>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

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

            {/* Bottom controls */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.bottomControls}>
                {/* Dot indicators */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    width: activeIndex === i ? 24 : 8,
                                    backgroundColor:
                                        activeIndex === i
                                            ? SgateColors.gold
                                            : 'rgba(255,255,255,0.15)',
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Next / Get Started button */}
                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.85}
                    style={styles.nextBtn}
                >
                    <Text style={styles.nextBtnText}>
                        {activeIndex < SLIDES.length - 1 ? 'Next' : 'Get Started'}
                    </Text>
                    <Feather name="arrow-right" size={18} color={SgateColors.black} />
                </TouchableOpacity>

                {/* Skip (only on first slide) */}
                {activeIndex === 0 ? (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.skipPlaceholder} />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.black,
    },
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
    glow: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        top: '20%',
    },
    mascotWrap: {
        marginBottom: 16,
    },
    slideTitle: {
        fontSize: 30,
        fontFamily: SgateFonts.extrabold,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 36,
        letterSpacing: -1.2,
        marginBottom: 14,
    },
    slideSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        lineHeight: 22,
    },
    bottomControls: {
        paddingHorizontal: 24,
        paddingBottom: 40,
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
    nextBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextBtnText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },
    skipBtn: {
        alignItems: 'center',
        paddingTop: 16,
    },
    skipText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.25)',
    },
    skipPlaceholder: {
        height: 45,
    },
});
