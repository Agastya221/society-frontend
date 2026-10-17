import React from 'react';
import { AppState } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useLanguageStore } from '@/i18n';

import GuardDashboard from '../../app/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(() => cb(), []);
  },
  useLocalSearchParams: () => ({}),
}));

const mockGuard = {
  id: 'g-001',
  name: 'Ravi Kumar',
  phone: '9123456789',
  role: 'GUARD',
  gate: 'North Gate',
  shift: 'MORNING',
};

const QUEUE_URL = '/api/v1/gate/entry-requests/queue';
const item = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: 'VISITOR', createdAt: new Date().toISOString(), status: 'PENDING', ...extra });

/** Home makes one call for its numbers: the gate queue (plus the flat directory prefetch). */
const mockCounts = ({ waiting = [] as unknown[], ready = [] as unknown[], stopped = [] as unknown[], insideCount = 0 } = {}) => {
  (api.get as jest.Mock).mockImplementation((url: string) => {
    if (url === QUEUE_URL) return Promise.resolve({ data: { data: { waiting, ready, stopped, insideCount } } });
    if (url.startsWith('/api/v1/gate/flats')) return Promise.resolve({ data: { data: { flats: [] } } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

/** Render the dashboard and flush the focus-effect API calls. */
const renderDashboard = async () => {
  const utils = render(<GuardDashboard />);
  await act(async () => {});
  return utils;
};

describe('Guard Dashboard (index)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    useAuthStore.setState({
      accessToken: 'guard-token',
      refreshToken: 'guard-refresh',
      isAuthenticated: true,
      user: mockGuard as any,
      isLoading: false,
    });
    mockCounts();
  });

  // ── Header ──────────────────────────────────────────────────────────────────
  describe('Header', () => {
    it('greets the guard by first name and shows the gate they are on duty at', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Hello,')).toBeTruthy();
      expect(getByText('Ravi')).toBeTruthy();
      expect(getByText('On duty · North Gate')).toBeTruthy();
      expect(getByText('R')).toBeTruthy();
    });

    it('falls back to "Main Gate" and "Guard"', async () => {
      useAuthStore.setState({ user: { ...mockGuard, name: undefined, gate: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Guard')).toBeTruthy();
      expect(getByText('On duty · Main Gate')).toBeTruthy();
    });

    it('speaks Hindi by default for guards', async () => {
      useLanguageStore.setState({ lang: 'hi' });
      const { getByText } = await renderDashboard();
      expect(getByText('नमस्ते,')).toBeTruthy();
      expect(getByText('QR स्कैन करें')).toBeTruthy();
      expect(getByText('नया विज़िटर')).toBeTruthy();
      expect(getByText('अभी अंदर')).toBeTruthy();
    });

    it('switches language from the top bar', async () => {
      useLanguageStore.setState({ lang: 'hi' });
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('English'));
      expect(getByText('Scan QR')).toBeTruthy();
      expect(getByText('New visitor')).toBeTruthy();
    });
  });

  // ── The two big actions ─────────────────────────────────────────────────────
  describe('Main actions', () => {
    it('shows only the two big gate actions, with plain words', async () => {
      const { getByText, queryByText } = await renderDashboard();
      expect(getByText('Scan QR')).toBeTruthy();
      expect(getByText('New visitor')).toBeTruthy();
      expect(queryByText('Pre-approved passes')).toBeNull();
      expect(queryByText('Staff check-in')).toBeNull();
      expect(queryByText('QUICK ACCESS')).toBeNull();
    });

    it.each([
      ['Scan QR', '/scan-verify'],
      ['New visitor', '/new-entry'],
      ['Inside now', '/today-entries'],
      ['Waiting', '/approvals'],
      ['Profile', '/profile'],
    ])('pressing "%s" pushes %s', async (label, route) => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(label));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(route);
    });
  });

  // ── Waiting visitors ────────────────────────────────────────────────────────
  describe('Waiting at gate', () => {
    it('shows the ready queue above the primary actions', async () => {
      mockCounts({ ready: [item('r1'), item('r2'), item('r3')] });
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('3 ready to enter'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });
    it('shows zero and the plain label when nobody is waiting', async () => {
      const { getByLabelText, queryByText } = await renderDashboard();
      expect(getByLabelText('Waiting 0')).toBeTruthy();
      expect(queryByText('Needs an answer')).toBeNull();
    });

    it('highlights the count and opens the waiting list', async () => {
      mockCounts({ waiting: [item('e1'), item('e2'), item('e3')] });
      const { getByText, getByLabelText } = await renderDashboard();
      expect(getByLabelText('Waiting 3')).toBeTruthy();
      expect(getByText('Needs an answer')).toBeTruthy();
      fireEvent.press(getByText('Needs an answer'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });

    it("shows resident stops but never the guard's own stops", async () => {
      mockCounts({
        stopped: [
          item('s1', { status: 'REJECTED', rejectionReason: 'Not expected' }),
          item('s2', { status: 'REJECTED', rejectionReason: 'Stopped by guard' }),
          item('s3', { status: 'EXPIRED', rejectionReason: 'Approval expired before arrival' }),
        ],
      });
      const { getByText } = await renderDashboard();
      expect(getByText('1 visitors stopped')).toBeTruthy();
    });
  });

  // ── Inside now ──────────────────────────────────────────────────────────────
  describe('Inside now', () => {
    it('shows the server inside count (visitors in + staff not checked out)', async () => {
      mockCounts({ insideCount: 3 });
      const { getByLabelText } = await renderDashboard();
      expect(getByLabelText('Inside now 3')).toBeTruthy();
    });
  });

  // ── Emergency ───────────────────────────────────────────────────────────────
  describe('Emergency', () => {
    it('only explains the hold on a short tap', async () => {
      const { getByLabelText, getByText } = await renderDashboard();
      fireEvent.press(getByLabelText('Emergency'));
      expect(getByText('Press and hold the button for 2 seconds')).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('opens the emergency screen on a long press', async () => {
      const { getByLabelText } = await renderDashboard();
      fireEvent(getByLabelText('Emergency'), 'longPress');
      expect(mockPush).toHaveBeenCalledWith('/emergencies');
    });
  });

  // ── API behaviour ───────────────────────────────────────────────────────────
  describe('API', () => {
    it('makes one queue call on focus for all the numbers', async () => {
      await renderDashboard();
      const queueCalls = (api.get as jest.Mock).mock.calls.filter(([url]) => !String(url).startsWith('/api/v1/gate/flats'));
      expect(queueCalls).toEqual([[QUEUE_URL]]);
    });

    it('handles API errors without crashing', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Server error'));
      const { getByText, getByLabelText, queryByText } = await renderDashboard();
      expect(getByText('Ravi')).toBeTruthy();
      expect(getByLabelText('Waiting 0')).toBeTruthy();
      expect(queryByText('No connection')).toBeNull(); // one miss is not "offline"
    });

    it('polls every 15 s, keeps last counts and shows No connection after 3 misses in a row', async () => {
      jest.useFakeTimers();
      const appState = AppState as unknown as { currentState: unknown };
      const previousState = appState.currentState;
      appState.currentState = 'active';
      try {
        mockCounts({ waiting: [item('e1'), item('e2')] });
        const { getByLabelText, queryByText } = await renderDashboard();
        expect(getByLabelText('Waiting 2')).toBeTruthy();

        (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
        for (let i = 0; i < 2; i++) await act(async () => { jest.advanceTimersByTime(15000); });
        expect(queryByText('No connection')).toBeNull();
        await act(async () => { jest.advanceTimersByTime(15000); });
        expect(queryByText('No connection')).toBeTruthy();
        expect(getByLabelText('Waiting 2')).toBeTruthy(); // last-known count kept

        mockCounts({ waiting: [item('e1')] });
        await act(async () => { jest.advanceTimersByTime(15000); });
        expect(queryByText('No connection')).toBeNull();
        expect(getByLabelText('Waiting 1')).toBeTruthy();
      } finally {
        appState.currentState = previousState;
        jest.useRealTimers();
      }
    });
  });
});
