import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

/**
 * Live connection to the server. It lets the server hand an alert straight to the open app
 * (loud full-screen alert) and only fall back to a push notification when the app is not open.
 *
 * The contract with the server (src/utils/socket.ts in the backend):
 *  - the app tells the server whether it is on screen ('app-state' = 'active' | 'background')
 *  - an 'alert' event is acknowledged with { shown: true } ONLY when the app really showed it;
 *    anything else makes the server send the push notification instead.
 */
export interface LiveAlert {
  title: string;
  body: string;
  data: Record<string, string>;
  urgent: boolean;
}

/** Returns true when the alert was shown to the person. */
export type LiveAlertHandler = (alert: LiveAlert) => boolean | Promise<boolean>;

interface StartOptions {
  /** Server root without the /api/v1 part */
  baseUrl: string;
  getToken: () => string | null;
  /** Any cheap authenticated call: it makes the API layer refresh an expired access token */
  refreshSession?: () => Promise<unknown>;
  onAlert: LiveAlertHandler;
}

let socket: Socket | null = null;
let appStateSub: { remove: () => void } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const currentState = () => (AppState.currentState === 'active' ? 'active' : 'background');

export function startRealtime(options: StartOptions): void {
  stopRealtime();

  const live = io(options.baseUrl, {
    // WebSocket only: long polling is slow and costs a request every few seconds
    transports: ['websocket'],
    auth: (done) => done({ token: options.getToken() }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  socket = live;

  live.on('connect', () => live.emit('app-state', currentState()));

  live.on('alert', async (alert: LiveAlert, ack?: (reply: { shown: boolean }) => void) => {
    let shown = false;
    // Only claim it when the app is really on screen, otherwise the server must send a push
    if (AppState.currentState === 'active') {
      try {
        shown = await options.onAlert(alert);
      } catch {
        shown = false;
      }
    }
    ack?.({ shown });
  });

  // An expired access token is refused at connect time: refresh the session, then try again
  live.on('connect_error', (error) => {
    if (!/token|auth/i.test(error?.message ?? '')) return;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      options.refreshSession?.().catch(() => {}).finally(() => {
        if (socket === live && !live.connected) live.connect();
      });
    }, 4000);
  });

  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && !live.connected) {
      options.refreshSession?.().catch(() => {}).finally(() => live.connect());
    }
    if (live.connected) live.emit('app-state', state === 'active' ? 'active' : 'background');
  });
}

export function stopRealtime(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  appStateSub?.remove();
  appStateSub = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
