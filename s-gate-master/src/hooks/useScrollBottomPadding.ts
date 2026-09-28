import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateLayout } from '@/constants/Sgate-theme';

/**
 * Height of the custom tab bar, excluding the safe-area inset.
 * Mirrors SgateTabBar's own layout: paddingTop 6 + item height 26.
 */
const TAB_BAR_CONTENT_HEIGHT = 32;

/** The tab bar's bottom padding, matching SgateTabBar exactly. */
function tabBarInset(bottom: number) {
    return Platform.OS === 'android'
        ? Math.min(Math.max(bottom, 8), 24)
        : Math.max(bottom, 10);
}

/**
 * Full height the tab bar occupies, including the safe-area inset.
 * Use when a screen needs to position something directly above the bar.
 */
export function useTabBarHeight() {
    const insets = useSafeAreaInsets();
    return TAB_BAR_CONTENT_HEIGHT + tabBarInset(insets.bottom);
}

/**
 * Bottom padding for a scrollable screen rendered behind the tab bar, so the
 * last row clears the bar with one gutter of breathing room.
 *
 * Replaces the hand-picked 16/20/32/40/60/88/100 values that left some screens'
 * last card under the bar and others with a large dead gap.
 *
 * @param extra additional space below the last row (defaults to one gutter)
 */
export function useScrollBottomPadding(extra: number = SgateLayout.screenGutter) {
    return useTabBarHeight() + extra;
}
