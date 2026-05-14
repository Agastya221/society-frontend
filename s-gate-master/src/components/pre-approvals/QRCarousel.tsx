import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Share,
    ImageBackground,
    ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    SharedValue,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const welcomeBg = require('@/assets/mygate-style-bg.png');

const { width: SW } = Dimensions.get('window');

const CARD_WIDTH = SW; // Now takes full width of scroll view for carousel elements
const SNAP_INTERVAL = SW;
const QR_SIZE = Math.min(SW * 0.45, 185); // Slightly larger as requested, but not too large

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QRPassData {
    id: string;
    code: string;
    name?: string;
    validUntil?: string;
    type?: string;
    note?: string;
}

interface QRCarouselProps {
    passes: QRPassData[];
    hostName?: string;
    flatInfo?: string;
    societyInfo?: { name: string; address?: string; city?: string };
    onDone?: () => void;
}

// ─── Pass Content (shared layout for single and multi) ───────────────────────

function PassContent({
    pass,
    hostName,
    flatInfo,
    societyInfo,
    index,
    total,
    onShare,
}: {
    pass: QRPassData;
    hostName?: string;
    flatInfo?: string;
    societyInfo?: { name: string; address?: string; city?: string };
    index?: number;
    total?: number;
    onShare: () => void;
}) {
    // Build address parts exactly like MyGate example
    const addressLine1 = `${flatInfo || ''}${flatInfo && societyInfo?.name ? ', ' : ''}${societyInfo?.name || ''}`;
    
    // Create the smaller grey text below
    const addrSub: string[] = [];
    if (societyInfo?.address) addrSub.push(societyInfo.address);
    if (societyInfo?.city) addrSub.push(societyInfo.city);
    const addrSubLine = addrSub.join(', ');
    
    const isPrivate = pass.type === 'PRIVATE';

    return (
        <View style={S.passContentWrapper}>
            {/* ── Private Badge ── */}
            {isPrivate && (
                <View style={S.privateBadge}>
                    <Feather name="lock" size={14} color="#7C5CC4" />
                    <Text style={S.privateBadgeText}>PRIVATE INVITE</Text>
                </View>
            )}

            {/* ── Invite header ── */}
            <Text style={S.inviteTitle}>
                <Text style={S.inviteBold}>{hostName || 'You'}</Text>
                {' has invited you.'}
            </Text>

            {(total ?? 0) > 1 && (
                <Text style={S.guestOf}>Guest {(index ?? 0) + 1} of {total}</Text>
            )}

            {/* ── Subtitle ── */}
            <Text style={S.subtitle}>
                {isPrivate ? 'Silent entry. Show this code to the guard.' : 'Show this QR code or OTP to the guard at gate'}
            </Text>

            {/* ── QR Code ── */}
            <View style={S.qrWrap}>
                {pass.code ? (
                    <QRCode value={pass.code} size={QR_SIZE} color="#111" backgroundColor="transparent" />
                ) : (
                    <View style={{ width: QR_SIZE, height: QR_SIZE, backgroundColor: '#EEE', borderRadius: 8 }} />
                )}
            </View>

            {/* ── OR divider ── */}
            <View style={S.orRow}>
                <View style={S.orLine} />
                <Text style={S.orText}>OR</Text>
                <View style={S.orLine} />
            </View>

            {/* ── Passcode pill ── */}
            <View style={S.codePill}>
                <Text style={S.codePillText}>{pass.code || '—'}</Text>
            </View>

            {/* ── Date/Time ── */}
            {pass.validUntil ? (
                <Text style={S.dateText}>{pass.validUntil}</Text>
            ) : null}

            {/* ── Address ── */}
            {addressLine1 ? (
                <View style={S.addressBlock}>
                    <Text style={S.addressMain}>{addressLine1}</Text>
                    {addrSubLine ? <Text style={S.addressSub}>{addrSubLine}</Text> : null}
                </View>
            ) : null}

            {/* ── Branding ── */}
            <View style={S.brandRow}>
                <Feather name="grid" size={20} color="#3C3226" />
                <Text style={S.brandText}>sgate</Text>
            </View>

            {/* Empty space pushes buttons/welcome img down naturally if needed */}
            <View style={{ flex: 1, minHeight: 40 }} />
            
            {/* ── Share button ── */}
            <TouchableOpacity style={S.shareYellowBtn} onPress={onShare} activeOpacity={0.8}>
                <Feather name="share" size={16} color="#3C3226" />
                <Text style={S.shareYellowText}>Share</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Single Pass ────────────────────────────────────────────────────────────

function SinglePassView({
    pass, hostName, flatInfo, societyInfo, onDone,
}: {
    pass: QRPassData;
    hostName?: string;
    flatInfo?: string;
    societyInfo?: { name: string; address?: string; city?: string };
    onDone?: () => void;
}) {
    const handleShare = async () => {
        try {
            const who = pass.name ? ` for ${pass.name}` : '';
            await Share.share({
                message: `🔑 Gate Pass${who}\nEntry Code: ${pass.code}\n\nShow this code or QR at the security gate.`,
            });
        } catch { /* cancelled */ }
    };

    return (
        <ScrollView
            style={S.scrollRoot}
            contentContainerStyle={S.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            <PassContent
                pass={pass}
                hostName={hostName}
                flatInfo={flatInfo}
                societyInfo={societyInfo}
                onShare={handleShare}
            />
        </ScrollView>
    );
}

// ─── Multi‐Pass Card ────────────────────────────────────────────────────────

function MultiCard({
    pass, index, total, hostName, flatInfo, societyInfo, scrollX, onShare,
}: {
    pass: QRPassData;
    index: number;
    total: number;
    hostName?: string;
    flatInfo?: string;
    societyInfo?: { name: string; address?: string; city?: string };
    scrollX: SharedValue<number>;
    onShare: () => void;
}) {
    const animStyle = useAnimatedStyle(() => {
        const input = [
            (index - 1) * SNAP_INTERVAL,
            index * SNAP_INTERVAL,
            (index + 1) * SNAP_INTERVAL,
        ];
        return {
            opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP),
        };
    });

    return (
        <Animated.View style={[S.multiOuter, animStyle]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={S.multiScroll}
                nestedScrollEnabled
            >
                <PassContent
                    pass={pass}
                    hostName={hostName}
                    flatInfo={flatInfo}
                    societyInfo={societyInfo}
                    index={index}
                    total={total}
                    onShare={onShare}
                />
            </ScrollView>
        </Animated.View>
    );
}

// ─── Pagination Dots ─────────────────────────────────────────────────────────

function PaginationDots({ total, scrollX }: { total: number; scrollX: SharedValue<number> }) {
    if (total <= 1) return null;
    return (
        <View style={S.dotsRow}>
            {Array.from({ length: total }).map((_, i) => {
                const dotStyle = useAnimatedStyle(() => {
                    const input = [(i - 1) * SNAP_INTERVAL, i * SNAP_INTERVAL, (i + 1) * SNAP_INTERVAL];
                    return {
                        width: interpolate(scrollX.value, input, [6, 22, 6], Extrapolation.CLAMP),
                        opacity: interpolate(scrollX.value, input, [0.25, 1, 0.25], Extrapolation.CLAMP),
                    };
                });
                return <Animated.View key={i} style={[S.dot, dotStyle]} />;
            })}
        </View>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function QRCarousel({ passes, hostName = 'You', flatInfo, societyInfo, onDone }: QRCarouselProps) {
    const scrollX = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => { scrollX.value = e.contentOffset.x; },
    });

    if (!passes || passes.length === 0) {
        return (
            <View style={S.emptyWrap}>
                <Feather name="alert-circle" size={28} color={SgateColors.t4} />
                <Text style={S.emptyText}>No passes generated</Text>
            </View>
        );
    }

    const single = passes.length === 1;

    // Multiple passes share handler
    const handleSharePass = async (pass: QRPassData) => {
        try {
            const who = pass.name ? ` for ${pass.name}` : '';
            await Share.share({
                message: `🔑 Gate Pass${who}\nEntry Code: ${pass.code}\n\nShow this code or QR at the security gate.`,
            });
        } catch { /* cancelled */ }
    };

    return (
        // Apply ImageBackground to the root element so it spans both single/multi seamlessly
        <ImageBackground source={welcomeBg} style={S.bgRoot} imageStyle={S.bgImage}>
            {single ? (
                <SinglePassView
                    pass={passes[0]}
                    hostName={hostName}
                    flatInfo={flatInfo}
                    societyInfo={societyInfo}
                    onDone={onDone}
                />
            ) : (
                <View style={S.carouselWrap}>
                    <Animated.FlatList
                        data={passes}
                        keyExtractor={(item, idx) => `${item.id}-${idx}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        bounces
                        pagingEnabled
                        snapToInterval={SNAP_INTERVAL}
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        onScroll={onScroll}
                        renderItem={({ item, index }) => (
                            <MultiCard
                                pass={item}
                                index={index}
                                total={passes.length}
                                hostName={hostName}
                                flatInfo={flatInfo}
                                societyInfo={societyInfo}
                                scrollX={scrollX}
                                onShare={() => handleSharePass(item)}
                            />
                        )}
                    />
                    <View style={S.paginationContainer}>
                        <PaginationDots total={passes.length} scrollX={scrollX} />
                    </View>
                </View>
            )}
            
            {/* Global Done Button stays at bottom for both */}
            {onDone && (
                <View style={S.doneWrap}>
                    <TouchableOpacity style={S.doneBtn} onPress={onDone} activeOpacity={0.85}>
                        <Text style={S.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ImageBackground>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    bgRoot: {
        flex: 1,
        width: '100%',
        backgroundColor: '#FFFFFF', // Fallback
    },
    bgImage: {
        resizeMode: 'cover',
        // By default it fills the container. 
    },
    
    scrollRoot: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },

    passContentWrapper: {
        alignItems: 'center',
        paddingHorizontal: 24,
        flex: 1, // Let it stretch to allow pushing the buttons down
    },

    // Carousel
    carouselWrap: { flex: 1 },
    multiOuter: {
        width: CARD_WIDTH,
    },
    multiScroll: {
        flexGrow: 1,
        paddingBottom: 10,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },

    // Invite
    privateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 30,
        marginBottom: -20, // Negative margin to sit above title without pushing everything down too much
        gap: 6,
        borderWidth: 1,
        borderColor: '#C9B8FF',
    },
    privateBadgeText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: '#7C5CC4',
        letterSpacing: 0.8,
    },
    inviteTitle: {
        fontSize: 22,
        fontFamily: SgateFonts.regular,
        color: '#1A1A1A',
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 2,
    },
    inviteBold: {
        fontFamily: SgateFonts.bold,
    },
    guestOf: {
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: '#555',
        textAlign: 'center',
        marginBottom: 2,
    },

    // Subtitle
    subtitle: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },

    // QR
    qrWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },

    // OR divider
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 60,
        width: '100%',
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#D0D0D0',
    },
    orText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#888',
        marginHorizontal: 16,
    },

    // Passcode pill
    codePill: {
        backgroundColor: '#013a3d', // MyGate dark teal exactly
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 40,
        marginBottom: 24,
    },
    codePillText: {
        fontSize: 34,
        fontFamily: SgateFonts.extrabold,
        color: '#FFFFFF',
        letterSpacing: 4,
    },

    // Date
    dateText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#7b5c19', // Amber brown
        textAlign: 'center',
        marginBottom: 12,
    },

    // Address
    addressBlock: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    addressMain: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#3C3226', // Warm brown
        textAlign: 'center',
        marginBottom: 4,
    },
    addressSub: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: '#5c4d3c',
        textAlign: 'center',
        lineHeight: 18,
    },

    // Brand
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
    },
    brandText: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: '#3C3226',
        letterSpacing: -0.5,
    },

    // Share yellow button
    shareYellowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFD60A',
        paddingVertical: 15,
        borderRadius: 12,
        marginBottom: 10,
        width: '100%',
        marginTop: 'auto', // Pushes to bottom of content
    },
    shareYellowText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: '#3C3226',
    },

    // Done Wrap
    doneWrap: {
        paddingHorizontal: 24, 
        paddingBottom: 20,
        paddingTop: 8,
        backgroundColor: 'transparent',
    },
    doneBtn: {
        backgroundColor: '#262626',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    doneText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },

    // Dots
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 5,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#7b5c19',
    },

    // Empty
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: '#999',
    },
});
