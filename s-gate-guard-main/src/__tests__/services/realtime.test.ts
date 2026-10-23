import { AppState } from 'react-native';

// A tiny stand-in for the socket: records emits and lets the test fire server events
type Listener = (...args: any[]) => void;
const mockSockets: MockSocket[] = [];
class MockSocket {
  listeners: Record<string, Listener> = {};
  emitted: Array<[string, unknown]> = [];
  connected = true;
  on = (event: string, fn: Listener) => { this.listeners[event] = fn; return this; };
  emit = (event: string, payload?: unknown) => { this.emitted.push([event, payload]); };
  connect = jest.fn();
  disconnect = jest.fn();
  removeAllListeners = jest.fn();
}
jest.mock('socket.io-client', () => ({
  io: () => { const s = new MockSocket(); mockSockets.push(s); return s; },
}));

import { startRealtime, stopRealtime } from '@/services/realtime';

const alert = { title: 'Visitor', body: 'At gate', data: { type: 'GATE_REQUEST' }, urgent: true };
const setAppState = (state: 'active' | 'background') => { (AppState as any).currentState = state; };

describe('realtime alerts', () => {
  beforeEach(() => { mockSockets.length = 0; setAppState('active'); });
  afterEach(() => stopRealtime());

  const start = (onAlert = jest.fn().mockResolvedValue(true)) => {
    startRealtime({ baseUrl: 'https://x', getToken: () => 'tok', onAlert });
    return { socket: mockSockets[0], onAlert };
  };

  it('tells the server whether the app is on screen as soon as it connects', () => {
    const { socket } = start();
    socket.listeners.connect();
    expect(socket.emitted).toContainEqual(['app-state', 'active']);
  });

  it('acknowledges { shown: true } only after the alert was really shown', async () => {
    const { socket, onAlert } = start();
    const ack = jest.fn();
    await socket.listeners.alert(alert, ack);
    expect(onAlert).toHaveBeenCalledWith(alert);
    expect(ack).toHaveBeenCalledWith({ shown: true });
  });

  it('does NOT claim the alert when the app is in the background, so the server sends a push', async () => {
    setAppState('background');
    const { socket, onAlert } = start();
    const ack = jest.fn();
    await socket.listeners.alert(alert, ack);
    expect(onAlert).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ shown: false });
  });

  it('does NOT claim the alert when showing it failed', async () => {
    const { socket } = start(jest.fn().mockRejectedValue(new Error('boom')));
    const ack = jest.fn();
    await socket.listeners.alert(alert, ack);
    expect(ack).toHaveBeenCalledWith({ shown: false });
  });

  it('closes the connection when stopped', () => {
    const { socket } = start();
    stopRealtime();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
