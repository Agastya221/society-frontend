import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';

/** Long enough for the tab cross-fade (180ms) to finish before unmounting. */
const UNMOUNT_DELAY = 300;

/**
 * Unmounts a screen after the user leaves it, so the next visit starts fresh.
 *
 * Every resident route is a (hidden) tab, and tabs stay mounted. Without this,
 * a form opened a second time still shows what was typed last time, and a
 * detail screen opened for another item first shows the previous item.
 *
 * The unmount waits until the leave transition is over, so nothing blanks
 * while it fades out; coming straight back cancels it and keeps the state.
 */
export function withResetOnBlur<P extends object>(Screen: React.ComponentType<P>) {
    function ResetOnBlur(props: P) {
        const [mounted, setMounted] = useState(true);
        const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

        useFocusEffect(useCallback(() => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
            setMounted(true);
            return () => {
                timer.current = setTimeout(() => setMounted(false), UNMOUNT_DELAY);
            };
        }, []));

        return mounted ? <Screen {...props} /> : null;
    }
    ResetOnBlur.displayName = `withResetOnBlur(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
    return ResetOnBlur;
}
