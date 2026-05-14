import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { StatusBar } from 'expo-status-bar';
import { SgateMascot } from '@/components/Sgate/SgateMascot';

type OnboardingStatus = 'PENDING_APPROVAL' | 'RESUBMIT_REQUESTED' | 'REJECTED' | 'APPROVED' | 'DRAFT' | 'PENDING_DOCS' | null;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingIndex() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStatus();
    }, []);

    const checkExistingStatus = async () => {
        try {
            const res = await api.get('/resident/onboarding/status');
            const status: OnboardingStatus = res.data?.data?.status ?? null;

            if (status === 'PENDING_APPROVAL' || status === 'RESUBMIT_REQUESTED' || status === 'REJECTED') {
                router.replace('/(onboarding)/status');
                return;
            }
            if (status === 'APPROVED') {
                router.replace('/(onboarding)/status');
                return;
            }
        } catch {
            // No existing request — show choice screen
        } finally {
            setChecking(false);
        }
    };

    if (checking) {
        return (
            <SafeAreaView edges={['top']} style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <AppLoader />
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.content}>
                    
                    {/* Header with Mascot */}
                    <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
                        <View style={styles.mascotWrap}>
                            <View style={styles.glow} />
                            <SgateMascot size={100} pose="wave" />
                        </View>
                        <Text style={styles.title}>Welcome to S-Gate</Text>
                        <Text style={styles.subtitle}>
                            Your community management starts here.{'\n'}How would you like to get started?
                        </Text>
                    </Animated.View>

                    {/* Option Cards */}
                    <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.cardsWrap}>
                        {/* Resident Onboarding */}
                        <TouchableOpacity
                            onPress={() => router.push('/(onboarding)/society-search')}
                            style={styles.cardPrimary}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.iconBoxPrimary}>
                                    <Feather name="search" size={24} color={SgateColors.black} />
                                </View>
                                <View style={styles.textWrap}>
                                    <Text style={styles.cardTitlePrimary}>Join Existing Society</Text>
                                    <Text style={styles.cardSubPrimary}>Search and request to join as a resident</Text>
                                </View>
                                <Feather name="chevron-right" size={22} color={SgateColors.black} />
                            </View>
                        </TouchableOpacity>

                        {/* Admin Onboarding */}
                        <TouchableOpacity
                            onPress={() => router.push('/(onboarding)/register-society')}
                            style={styles.cardSecondary}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.iconBoxSecondary}>
                                    <Feather name="plus-circle" size={24} color={SgateColors.white} />
                                </View>
                                <View style={styles.textWrap}>
                                    <Text style={styles.cardTitleSecondary}>Register My Society</Text>
                                    <Text style={styles.cardSubSecondary}>Set up a new society as an admin</Text>
                                </View>
                                <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.black,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    mascotWrap: {
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: SgateColors.gold + '15',
    },
    title: {
        fontSize: 28,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.white,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
    cardsWrap: {
        gap: 16,
    },
    cardPrimary: {
        backgroundColor: SgateColors.gold,
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: SgateColors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    cardSecondary: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBoxPrimary: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxSecondary: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    cardTitlePrimary: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
        marginBottom: 4,
    },
    cardSubPrimary: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: 'rgba(0,0,0,0.6)',
    },
    cardTitleSecondary: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.white,
        marginBottom: 4,
    },
    cardSubSecondary: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.4)',
    },
});
