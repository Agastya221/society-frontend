/**
 * MSG91 OTP Widget — Client-side credentials
 *
 * SECURITY NOTES:
 * - widgetId and tokenAuth are PUBLISHABLE keys — safe to be in the app bundle.
 *   They can only trigger OTP flows on your own configured widget which is
 *   rate-limited by MSG91.
 *
 * - The SERVER-SIDE authkey (MSG91_WIDGET_AUTH_KEY in backend .env) is what
 *   actually verifies ownership. That must NEVER appear in the frontend.
 *
 * If you ever rotate these keys, update them here and both screens pick it up.
 */
export const MSG91_WIDGET_ID   = '36616d6c644f393633343730';
export const MSG91_TOKEN_AUTH  = '486792TSKV5jSbverR69674835P1';
