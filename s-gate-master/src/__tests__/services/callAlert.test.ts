import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import notifee from '@notifee/react-native';
import {
  answerFromNotification, buildCallNotification, cancelCallAlert, extractPayload, registerCallAlert, showCallAlert,
} from '@/services/callAlert';

const push = { type: 'GATE_REQUEST', callStyle: '1', entryRequestId: 'r1', visitorName: 'Rahul', peopleCount: '1', title: 'Visitor', body: 'Rahul is at the gate' };

describe('extractPayload (the push reaches the background task in different shapes)', () => {
  it('finds the fields when they are on the object itself', () => {
    expect(extractPayload(push)?.entryRequestId).toBe('r1');
  });
  it('finds them under data', () => {
    expect(extractPayload({ data: push })?.entryRequestId).toBe('r1');
  });
  it('finds them in a JSON string (dataString / body)', () => {
    expect(extractPayload({ dataString: JSON.stringify(push) })?.visitorName).toBe('Rahul');
    expect(extractPayload({ notification: { data: { body: JSON.stringify(push) } } })?.visitorName).toBe('Rahul');
  });
  it('finds them under a notification request', () => {
    expect(extractPayload({ notification: { request: { content: { data: push } } } })?.entryRequestId).toBe('r1');
  });
  it('ignores pushes that are not call-style gate alerts', () => {
    expect(extractPayload({ data: { type: 'NOTICE', title: 'x' } })).toBeNull();
    expect(extractPayload({ data: { ...push, callStyle: '0' } })).toBeNull();
    expect(extractPayload(null)).toBeNull();
    expect(extractPayload('not json')).toBeNull();
  });
});

describe('buildCallNotification', () => {
  it('rings like a call: call category, full screen, one minute, Allow and Decline', () => {
    const n = buildCallNotification(push);
    expect(n.id).toBe('gate-r1');
    expect(n.android.category).toBe('call');
    expect(n.android.fullScreenAction).toEqual({ id: 'open', launchActivity: 'default' });
    expect(n.android.timeoutAfter).toBe(60_000);
    expect(n.android.actions.map((a) => a.title)).toEqual(['Decline', 'Allow']);
  });
  it('for a group offers Decline and "Choose how many" instead of Allow, so nobody is let in by mistake', () => {
    const n = buildCallNotification({ ...push, peopleCount: '4' });
    expect(n.android.actions.map((a) => a.title)).toEqual(['Decline', 'Choose how many']);
    expect(n.android.actions.some((a) => a.pressAction.id === 'allow')).toBe(false);
  });
  it('names the visitor type on the call screen: cab, delivery, service, and Allow works for each', () => {
    for (const [requestType, title] of [['CAB', 'Cab at the gate'], ['DELIVERY', 'Delivery at the gate'], ['VENDOR', 'Service person at the gate']]) {
      const n = buildCallNotification({ ...push, requestType, visitorName: '', body: 'A cab is waiting at the gate' });
      expect(n.title).toBe(title);
      expect(n.android.actions.map((a) => a.title)).toEqual(['Decline', 'Allow']);
    }
    expect(buildCallNotification({ ...push, requestType: 'VISITOR' }).title).toBe(push.title);
  });

  it('keeps the data as plain strings for the press handlers', () => {
    expect(buildCallNotification(push).data.entryRequestId).toBe('r1');
  });
});

describe('answerFromNotification (Allow / Decline on the lock screen)', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) => Promise.resolve(store.get(k) ?? null));
    (SecureStore.setItemAsync as jest.Mock).mockImplementation((k: string, v: string) => { store.set(k, v); return Promise.resolve(); });
    (global as any).fetch = jest.fn();
  });
  const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

  it('approves with the saved session', async () => {
    store.set('accessToken', 'tok');
    (global.fetch as jest.Mock).mockResolvedValue(reply(200));
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(true);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/gate/entry-requests/r1/approve');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('declines through the reject route', async () => {
    store.set('accessToken', 'tok');
    (global.fetch as jest.Mock).mockResolvedValue(reply(200));
    await answerFromNotification('r1', 'reject');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/r1/reject');
  });

  it('renews an expired session once and then answers', async () => {
    store.set('accessToken', 'old');
    store.set('refreshToken', 'ref');
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(reply(401))
      .mockResolvedValueOnce(reply(200, { data: { accessToken: 'new', refreshToken: 'ref2' } }))
      .mockResolvedValueOnce(reply(200));
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(true);
    expect(store.get('accessToken')).toBe('new');
    expect(store.get('refreshToken')).toBe('ref2');
    expect((global.fetch as jest.Mock).mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  });

  it('gives up (so the app asks the person to open it) when signed out or the session cannot be renewed', async () => {
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(false);
    store.set('accessToken', 'old');
    store.set('refreshToken', 'ref');
    (global.fetch as jest.Mock).mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(401, { success: false }));
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(false);
  });

  it('treats "already answered" (another family member got there first) as done', async () => {
    store.set('accessToken', 'tok');
    (global.fetch as jest.Mock).mockResolvedValue(reply(409));
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(true);
  });

  it('reports a network failure as not answered', async () => {
    store.set('accessToken', 'tok');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(answerFromNotification('r1', 'approve')).resolves.toBe(false);
  });
});

describe('call alert plumbing', () => {
  const original = Platform.OS;
  beforeEach(() => { jest.clearAllMocks(); (Platform as any).OS = 'android'; });
  afterAll(() => { (Platform as any).OS = original; });

  it('creates the ringing channel and shows the call screen', async () => {
    await showCallAlert(push);
    expect((notifee.createChannel as jest.Mock).mock.calls[0][0]).toMatchObject({ id: 'gate-call-v1', sound: 'gate_alert' });
    expect((notifee.displayNotification as jest.Mock).mock.calls[0][0].id).toBe('gate-r1');
  });

  it('cancels the call screen for a request that was answered', async () => {
    await cancelCallAlert('r1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('gate-r1');
  });

  it('registers the background handlers on Android only', () => {
    registerCallAlert();
    expect(notifee.onBackgroundEvent).toHaveBeenCalledTimes(1);
    (Platform as any).OS = 'ios';
    registerCallAlert();
    expect(notifee.onBackgroundEvent).toHaveBeenCalledTimes(1);
  });
});
