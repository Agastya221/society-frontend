/**
 * True when the app is built for automated phone tests (EXPO_PUBLIC_E2E=1). Endless animations
 * (pulsing dots, scan line) are switched off then, because the test tool waits for the screen to
 * stop moving before every tap and would otherwise wait several seconds per step.
 */
export const E2E = process.env.EXPO_PUBLIC_E2E === '1';
