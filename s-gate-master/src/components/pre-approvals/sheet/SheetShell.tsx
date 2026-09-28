import React, { createContext, useContext, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SgateColors, SgateLayout } from '@/constants/Sgate-theme';

/**
 * How tall a step wants to be.
 *
 * `fit`  — the sheet hugs the step's content. For short steps (a type picker, a
 *          small form) so there is no empty space under the button.
 * `fill` — the sheet takes the whole height it is allowed. For steps built around
 *          a list (pick contacts, manage guests) where showing more rows is the
 *          point, and where a shrinking sheet is the bug rather than the feature.
 */
export type StepHeight = 'fit' | 'fill';

export interface SheetShellProps {
    /** Fixed to the top of the sheet; never scrolls away. */
    header?: React.ReactNode;
    /** Pinned under the header — filter chips, a search field, a summary bar. */
    subHeader?: React.ReactNode;
    /** The scrolling region. Everything that can grow lives here. */
    children: React.ReactNode;
    /** Fixed to the bottom; stays visible no matter how long the body gets. */
    footer?: React.ReactNode;
    footerStyle?: StyleProp<ViewStyle>;
    height?: StepHeight;
    /** Space below the footer so it clears the tab bar / gesture bar. */
    bottomClearance?: number;
    contentContainerStyle?: StyleProp<ViewStyle>;
    scrollRef?: React.Ref<ScrollView>;
    onScroll?: React.ComponentProps<typeof ScrollView>['onScroll'];
    /**
     * Colour of the step's top edge when it isn't the card colour (artwork
     * steps). The sheet paints its handle strip to match, so there is no
     * white band above a full-bleed header.
     */
    chromeColor?: string;
}

export interface SheetHost {
    /** The height the step would like: header + body content + footer. */
    reportHeight: (height: number) => void;
    /**
     * The colour the step's top edge starts with, so the sheet's handle strip
     * can match it. `null` for the default card colour.
     */
    reportChrome: (color: string | null) => void;
}

/**
 * How a step talks to the sheet it is in. The sheet provides it; a step that
 * is fading out gets `null`, so only the incoming step is heard.
 */
export const SheetMeasureContext = createContext<SheetHost | null>(null);

/**
 * The anatomy every step in the pre-approval sheet is built from.
 *
 * The shell always fills the sheet: header pinned to the top, footer pinned to
 * the bottom, and the body taking whatever is between. The sheet animates its
 * own height, so when a step's content changes (a tab switch, a guest added)
 * the header and button stay put and only the space in the middle grows or
 * shrinks — the body reads as expanding or collapsing, never as jumping.
 *
 * Because the shell fills rather than hugs, it can't be measured by its own
 * layout. Instead it adds up what it would need — header, body content and
 * footer, each measured on its own — and reports that. The sheet springs to it
 * (capped by the screen), and a body taller than that scrolls.
 */
export function SheetShell({
    header,
    subHeader,
    children,
    footer,
    footerStyle,
    bottomClearance = SgateLayout.screenGutter,
    contentContainerStyle,
    scrollRef,
    onScroll,
    chromeColor,
}: SheetShellProps) {
    const host = useContext(SheetMeasureContext);
    const report = host?.reportHeight;
    const parts = useRef<{ top: number | null; body: number | null; bottom: number | null }>({
        top: null,
        body: null,
        bottom: footer ? null : 0,
    });
    const hasFooter = Boolean(footer);
    parts.current.bottom = hasFooter ? parts.current.bottom : 0;

    const flush = () => {
        const { top, body, bottom } = parts.current;
        if (top === null || body === null || bottom === null) return;
        report?.(Math.ceil(top + body + bottom));
    };
    const measure = (part: 'top' | 'body' | 'bottom', value: number) => {
        if (parts.current[part] === value) return;
        parts.current[part] = value;
        flush();
    };

    // A step that starts leaving and comes back gets a fresh reporter.
    useEffect(flush, [report]);

    useEffect(() => {
        host?.reportChrome(chromeColor ?? null);
    }, [host, chromeColor]);

    return (
        <View style={S.root}>
            <View onLayout={e => measure('top', e.nativeEvent.layout.height)}>
                {header}
                {subHeader}
            </View>

            <ScrollView
                ref={scrollRef}
                style={S.body}
                /* With no footer to carry it, the clearance has to go on the
                   body, or the last row sits under the tab bar. */
                contentContainerStyle={[contentContainerStyle, !footer && { paddingBottom: bottomClearance }]}
                onContentSizeChange={(_w, h) => measure('body', h)}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bounces={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {children}
            </ScrollView>

            {footer ? (
                <View
                    style={[S.footer, { paddingBottom: bottomClearance }, footerStyle]}
                    onLayout={e => measure('bottom', e.nativeEvent.layout.height)}
                >
                    {footer}
                </View>
            ) : null}
        </View>
    );
}

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.card,
    },
    /** Everything between header and footer; scrolls once the sheet is capped. */
    body: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: SgateLayout.screenGutter,
        paddingTop: 12,
        backgroundColor: SgateColors.card,
    },
});
