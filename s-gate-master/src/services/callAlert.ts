import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

/**
 * Call-style gate alert: a visitor at the gate rings like an incoming call, full screen over the lock screen,
 * with Allow / Decline right on it. The server sends a data-only push for it (see GATE_CALL_STYLE in the backend);
 * this file draws the alert from that push while the app is in the background or closed.
 *
 * Android only. When the app is open the normal in-app card (LiveAlertHost) is used instead.
 */
const TASK_NAME = 'SGATE_GATE_CALL_ALERT';
export const CALL_CHANNEL_ID = 'gate-call-v1';
const API = 'https://society-gate-backend-gsrq.onrender.com/api/v1';
/** The server drops an unanswered alert after a minute, so the call screen stops ringing then too */
const RING_MS = 60_000;

export interface CallPayload {
  type?: string;
  callStyle?: string;
  entryRequestId?: string;
  visitorName?: string;
  peopleCount?: string;
  requestType?: string;
  title?: string;
  body?: string;
  [key: string]: unknown;
}

/** The push can reach the background task in a few shapes depending on the OS version; take the first that has our fields. */
export function extractPayload(raw: unknown): CallPayload | null {
  const seen: unknown[] = [];
  const queue: unknown[] = [raw];
  while (queue.length) {
    const item = queue.shift();
    if (!item || seen.includes(item)) continue;
    seen.push(item);
    if (typeof item === 'string') {
      try { queue.push(JSON.parse(item)); } catch { /* not JSON */ }
      continue;
    }
    if (typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (obj.callStyle === '1' && typeof obj.entryRequestId === 'string') return obj as CallPayload;
    queue.push(obj.data, obj.dataString, obj.body, obj.notification, (obj.notification as any)?.data, (obj.request as any)?.content?.data);
  }
  return null;
}

const TYPE_TITLE: Record<string, string> = {
  CAB: 'Cab at the gate',
  DELIVERY: 'Delivery at the gate',
  VENDOR: 'Service person at the gate',
  DOMESTIC_STAFF: 'Help at the gate',
  CAB_DRIVER: 'Cab at the gate',
};

/** What to draw. A group arriving together only gets Decline on the call screen: how many to let in is chosen in the app. */
export function buildCallNotification(payload: CallPayload) {
  const group = Number(payload.peopleCount) > 1;
  const id = `gate-${payload.entryRequestId}`;
  return {
    id,
    title: TYPE_TITLE[String(payload.requestType ?? '')] ?? String(payload.title ?? 'Visitor at the gate'),
    body: String(payload.body ?? 'Someone is waiting for your answer'),
    data: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) as Record<string, string>,
    android: {
      channelId: CALL_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      smallIcon: 'notification_icon',
      color: '#FFB800',
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      timeoutAfter: RING_MS,
      pressAction: { id: 'open', launchActivity: 'default' },
      fullScreenAction: { id: 'open', launchActivity: 'default' },
      actions: group
        ? [{ title: 'Decline', pressAction: { id: 'decline' } }, { title: 'Choose how many', pressAction: { id: 'open', launchActivity: 'default' } }]
        : [{ title: 'Decline', pressAction: { id: 'decline' } }, { title: 'Allow', pressAction: { id: 'allow' } }],
    },
  };
}

export async function showCallAlert(payload: CallPayload): Promise<void> {
  await notifee.createChannel({
    id: CALL_CHANNEL_ID,
    name: 'Visitor at the gate (rings like a call)',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'gate_alert',
    vibration: true,
    vibrationPattern: [700, 300, 700, 300, 700, 300],
  });
  await notifee.displayNotification(buildCallNotification(payload));
}

export async function cancelCallAlert(entryRequestId?: string): Promise<void> {
  if (Platform.OS !== 'android' || !entryRequestId) return;
  try { await notifee.cancelNotification(`gate-${entryRequestId}`); } catch { /* nothing to cancel */ }
}

/** Answers from the lock screen with the saved session. A dead session is refreshed once; if that fails the person is asked to open the app. */
export async function answerFromNotification(entryRequestId: string, kind: 'approve' | 'reject'): Promise<boolean> {
  const call = async (token: string) => fetch(`${API}/gate/entry-requests/${entryRequestId}/${kind}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}',
  });
  try {
    let token = await SecureStore.getItemAsync('accessToken');
    if (!token) return false;
    let response = await call(token);
    if (response.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return false;
      const renewed = await fetch(`${API}/users/refresh-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
      });
      const body = await renewed.json().catch(() => null);
      if (!renewed.ok || !body?.data?.accessToken || !body?.data?.refreshToken) return false;
      await SecureStore.setItemAsync('accessToken', body.data.accessToken);
      await SecureStore.setItemAsync('refreshToken', body.data.refreshToken);
      token = body.data.accessToken as string;
      response = await call(token);
    }
    // 4xx other than auth usually means it was already answered (family member, timeout): nothing more to do
    return response.ok || (response.status >= 400 && response.status < 500 && response.status !== 401);
  } catch {
    return false;
  }
}

async function onAction(actionId: string | undefined, notification: { id?: string; data?: Record<string, unknown> } | undefined) {
  const requestId = String(notification?.data?.entryRequestId ?? '');
  if ((actionId !== 'allow' && actionId !== 'decline') || !requestId) return;
  const done = await answerFromNotification(requestId, actionId === 'allow' ? 'approve' : 'reject');
  if (notification?.id) await notifee.cancelNotification(notification.id);
  if (!done) {
    // Could not answer from here (signed out, offline): leave a normal notification that opens the app
    await notifee.displayNotification({
      title: 'Open S-Gate to answer',
      body: `${notification?.data?.visitorName ?? 'A visitor'} is still waiting`,
      data: Object.fromEntries(Object.entries(notification?.data ?? {}).map(([k, v]) => [k, String(v)])),
      android: { channelId: CALL_CHANNEL_ID, smallIcon: 'notification_icon', pressAction: { id: 'open', launchActivity: 'default' } },
    });
  }
}

/** Run once at start-up (module scope, so it also exists when the app is woken in the background). */
export function registerCallAlert(): void {
  if (Platform.OS !== 'android') return;

  TaskManager.defineTask(TASK_NAME, async ({ data, error }: { data: unknown; error: unknown }) => {
    if (error) return;
    const payload = extractPayload(data);
    if (!payload) return;
    try {
      await showCallAlert(payload);
    } catch {
      // Drawing the call screen failed: fall back to a plain notification so the visitor is never lost
      try {
        await notifee.displayNotification({
          id: `gate-${payload.entryRequestId}`,
          title: String(payload.title ?? 'Visitor at the gate'),
          body: String(payload.body ?? ''),
          data: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])),
          android: { channelId: CALL_CHANNEL_ID, smallIcon: 'notification_icon', pressAction: { id: 'open', launchActivity: 'default' } },
        });
      } catch { /* nothing more to try */ }
    }
  });
  Notifications.registerTaskAsync(TASK_NAME).catch(() => undefined);

  // Allow / Decline pressed while the app is closed or in the background
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) await onAction(detail.pressAction?.id, detail.notification as any);
  });
}

/** In the open app: pressing the call screen or its buttons. `open` is told which gate request to show. */
export function attachCallAlertForeground(open: (data: Record<string, any>) => void): () => void {
  if (Platform.OS !== 'android') return () => undefined;

  void notifee.getInitialNotification().then((initial) => {
    if (initial?.notification?.data?.entryRequestId) open(initial.notification.data as Record<string, any>);
  }).catch(() => undefined);

  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      void onAction(detail.pressAction?.id, detail.notification as any);
    } else if (type === EventType.PRESS && detail.notification?.data?.entryRequestId) {
      open(detail.notification.data as Record<string, any>);
    }
  });
}
