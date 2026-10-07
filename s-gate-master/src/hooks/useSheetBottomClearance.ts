import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateLayout } from '@/constants/Sgate-theme';

/**
 * Space a bottom-anchored element (sheet surface, fixed CTA bar) should leave
 * below its content.
 *
 * The tab bar is a sibling of the screen, not an overlay, so on a tab screen the
 * content already stops above it — padding for the bar as well only leaves a dead
 * strip. Off the tab navigator the element reaches the screen edge and has to
 * clear the gesture/navigation bar itself.
 *
 * A sheet presented in a <Modal> is a separate layer that the tab bar paints
 * over, so it has to clear the whole bar — pass `overlaidByTabBar`.
 *
 * @param options.extra additional space beyond the standard gutter
 * @param options.overlaidByTabBar true for sheets rendered inside a <Modal>
 */
export function useSheetBottomClearance(
    { extra = 0, overlaidByTabBar = false }: { extra?: number; overlaidByTabBar?: boolean } = {},
) {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useContext(BottomTabBarHeightContext);
    const insideTabNavigator = tabBarHeight != null;

    if (insideTabNavigator) {
        // Inline sheets already stop at the top of the bar; modal sheets do not.
        return (overlaidByTabBar ? tabBarHeight : 0) + SgateLayout.screenGutter + extra;
    }
    return insets.bottom + SgateLayout.screenGutter + extra;
}
