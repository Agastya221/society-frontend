import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

export interface ScreenHeaderProps {
    /** Primary title text */
    title: string;
    /** Optional subtitle below the title */
    subtitle?: string;
    /** Whether to show the back button (default: true) */
    showBack?: boolean;
    /** Custom back handler — defaults to router.back() */
    onBack?: () => void;
    /** Optional right-side element (e.g. icon button) */
    rightElement?: React.ReactNode;
}

/**
 * Reusable edge-to-edge screen header that matches the Society screen header exactly.
 * Extends fully behind the status bar with proper safe-area handling.
 *
 * Usage:
 * ```tsx
 * <ScreenHeader title="Local Directory" />
 * <ScreenHeader title="Plumber" subtitle="3 contacts" />
 * ```
 */
export function ScreenHeader({
    title,
    subtitle,
    showBack = true,
    onBack,
    rightElement,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        }
    };

    return (
        <>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                {showBack && (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Go back"
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={styles.headerSub} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {rightElement ? (
                    <View style={styles.rightWrap}>{rightElement}</View>
                ) : null}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    headerSub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },
    rightWrap: {
        marginLeft: 12,
    },
});
