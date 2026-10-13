import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useLanguageStore } from '@/i18n';

import GuardDashboard from '../../app/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => { cb(); }, []);
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

/** Answers the two calls Home makes: waiting visitors and today's gate activity. */
const mockCounts = ({ pending = [] as unknown, today = { entries: [], staffAttendances: [] } as unknown } = {}) => {
  (api.get as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('entry-requests')) return Promise.resolve({ data: { data: { entries: pending } } });
    if (url.includes('guard/today')) return Promise.resolve({ data: { data: today } });
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

  // ── Greeting ────────────────────────────────────────────────────────────────
  describe('Greeting', () => {
    it('greets the guard by first name with the gate', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Hello, Ravi · North Gate')).toBeTruthy();
    });

    it('falls back to "Main Gate" and "Guard"', async () => {
      useAuthStore.setState({ user: { ...mockGuard, name: undefined, gate: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Hello, Guard · Main Gate')).toBeTruthy();
    });

    it('speaks Hindi by default for guards', async () => {
      useLanguageStore.setState({ lang: 'hi' });
      const { getByText } = await renderDashboard();
      expect(getByText('नमस्ते, Ravi · North Gate')).toBeTruthy();
      expect(getByText('QR स्कैन करें')).toBeTruthy();
      expect(getByText('नया विज़िटर')).toBeTruthy();
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
      ['Inside now: 0', '/today-entries'],
      ['Profile', '/profile'],
    ])('pressing "%s" pushes %s', async (label, route) => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(label));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(route);
    });
  });

  // ── Waiting visitors strip ──────────────────────────────────────────────────
  describe('Waiting at gate strip', () => {
    it('is hidden when nobody is waiting', async () => {
      const { queryByText } = await renderDashboard();
      expect(queryByText(/waiting/)).toBeNull();
    });

    it('shows the plural count and opens the waiting list', async () => {
      mockCounts({ pending: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }] });
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('3 visitors waiting'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });

    it('uses the singular for one visitor', async () => {
      mockCounts({ pending: [{ id: 'e1' }] });
      const { getByText } = await renderDashboard();
      expect(getByText('1 visitor waiting')).toBeTruthy();
    });

    it('handles the entryRequests and flat array response shapes', async () => {
      (api.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('entry-requests')) return Promise.resolve({ data: { data: { entryRequests: [{ id: 'a' }, { id: 'b' }] } } });
        return Promise.resolve({ data: { data: {} } });
      });
      const first = await renderDashboard();
      expect(first.getByText('2 visitors waiting')).toBeTruthy();
      first.unmount();

      (api.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('entry-requests')) return Promise.resolve({ data: { data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] } });
        return Promise.resolve({ data: { data: {} } });
      });
      const second = await renderDashboard();
      expect(second.getByText('4 visitors waiting')).toBeTruthy();
    });
  });

  // ── Inside now ──────────────────────────────────────────────────────────────
  describe('Inside now', () => {
    it('counts visitors checked in and staff who have not checked out', async () => {
      mockCounts({
        today: {
          entries: [{ status: 'CHECKED_IN' }, { status: 'CHECKED_OUT' }, { status: 'CHECKED_IN' }, { status: 'PENDING' }],
          staffAttendances: [{ checkOutTime: null }, { checkOutTime: '2026-10-13T10:00:00Z' }],
        },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('Inside now: 3')).toBeTruthy();
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
    it('fetches waiting visitors and today activity on focus', async () => {
      await renderDashboard();
      expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests?status=PENDING');
      expect(api.get).toHaveBeenCalledWith('/api/v1/guard/today');
    });

    it('handles API errors without crashing', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Server error'));
      const { getByText, queryByText } = await renderDashboard();
      expect(getByText('Hello, Ravi · North Gate')).toBeTruthy();
      expect(queryByText(/waiting/)).toBeNull();
    });
  });
});
