import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

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
  gate: 'Main Gate',
  shift: 'MORNING',
};

/** Render the dashboard and flush all async effects/state updates. */
const renderDashboard = async () => {
  const utils = render(<GuardDashboard />);
  // Flush useEffect + pending API Promises + state updates
  await act(async () => {});
  return utils;
};

describe('Guard Dashboard (index)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'guard-token',
      refreshToken: 'guard-refresh',
      isAuthenticated: true,
      user: mockGuard as any,
      isLoading: false,
    });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { entries: [] } } });
  });

  // ── Header ──────────────────────────────────────────────────────────────────
  describe('Header', () => {
    it('renders gate name from user', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Main Gate')).toBeTruthy();
    });

    it('renders guard name from user', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Ravi Kumar')).toBeTruthy();
    });

    it('renders Morning Shift duty badge', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Morning Shift')).toBeTruthy();
    });

    it('renders Evening Shift for EVENING shift', async () => {
      useAuthStore.setState({ user: { ...mockGuard, shift: 'EVENING' } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Evening Shift')).toBeTruthy();
    });

    it('renders Night Shift for NIGHT shift', async () => {
      useAuthStore.setState({ user: { ...mockGuard, shift: 'NIGHT' } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Night Shift')).toBeTruthy();
    });

    it('falls back to "Gate" when gate is absent', async () => {
      useAuthStore.setState({ user: { ...mockGuard, gate: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Gate')).toBeTruthy();
    });

    it('falls back to "Guard" when name is absent', async () => {
      useAuthStore.setState({ user: { ...mockGuard, name: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Guard')).toBeTruthy();
    });
  });

  // ── Section labels ──────────────────────────────────────────────────────────
  describe('Section labels', () => {
    it('renders MAIN ACTIONS label', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('MAIN ACTIONS')).toBeTruthy();
    });

    it('renders MORE ACTIONS label', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('MORE ACTIONS')).toBeTruthy();
    });
  });

  // ── Action tiles ────────────────────────────────────────────────────────────
  describe('Action tiles', () => {
    it('renders New Entry tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('New Entry')).toBeTruthy();
    });

    it('renders Scan QR tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Scan QR')).toBeTruthy();
    });

    it("renders Today's Entries tile", async () => {
      const { getByText } = await renderDashboard();
      expect(getByText(/Today.s/i)).toBeTruthy();
    });

    it('renders Approvals tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Approvals')).toBeTruthy();
    });

    it('renders Staff Check-In tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText(/Staff/i)).toBeTruthy();
    });

    it('renders My Profile tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText(/Profile/i)).toBeTruthy();
    });

    it('renders Report Emergency tile', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Report Emergency')).toBeTruthy();
    });
  });

  // ── Navigation ──────────────────────────────────────────────────────────────
  describe('Navigation', () => {
    it('navigates to /new-entry when New Entry is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('New Entry'));
      expect(mockPush).toHaveBeenCalledWith('/new-entry');
    });

    it('navigates to /scan-verify when Scan QR is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('Scan QR'));
      expect(mockPush).toHaveBeenCalledWith('/scan-verify');
    });

    it("navigates to /today-entries when Today's Entries is pressed", async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(/Today.s/i));
      expect(mockPush).toHaveBeenCalledWith('/today-entries');
    });

    it('navigates to /approvals when Approvals tile is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('Approvals'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });

    it('navigates to /staff-scan when Staff Check-In is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(/Staff/i));
      expect(mockPush).toHaveBeenCalledWith('/staff-scan');
    });

    it('navigates to /profile when My Profile is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(/Profile/i));
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('navigates to /emergencies when Report Emergency is pressed', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('Report Emergency'));
      expect(mockPush).toHaveBeenCalledWith('/emergencies');
    });
  });

  // ── Pending approvals banner ─────────────────────────────────────────────────
  describe('Pending approvals banner', () => {
    it('does NOT show banner when pendingCount is 0', async () => {
      const { queryByText } = await renderDashboard();
      expect(queryByText(/waiting for approval/i)).toBeNull();
    });

    it('shows banner with count when entries are pending', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { entries: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }] } },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('3 waiting for approval')).toBeTruthy();
    });

    it('navigates to /approvals when banner is pressed', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { entries: [{ id: 'e1' }, { id: 'e2' }] } },
      });
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('2 waiting for approval'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });
  });

  // ── API behaviour ────────────────────────────────────────────────────────────
  describe('API', () => {
    it('calls entry-requests?status=PENDING on focus', async () => {
      await renderDashboard();
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('entry-requests'),
      );
    });

    it('handles API errors without crashing', async () => {
      (api.get as jest.Mock).mockRejectedValueOnce(new Error('Server error'));
      const { getByText } = await renderDashboard();
      expect(getByText('Main Gate')).toBeTruthy();
    });

    it('handles alternative data response shape (flat array)', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ id: 'e1' }, { id: 'e2' }] },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('2 waiting for approval')).toBeTruthy();
    });
  });
});
