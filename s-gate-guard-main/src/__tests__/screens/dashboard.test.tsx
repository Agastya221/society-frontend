import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
  gate: 'North Gate',
  shift: 'MORNING',
};

/** Render the dashboard and flush the focus-effect API call. */
const renderDashboard = async () => {
  const utils = render(<GuardDashboard />);
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
    it('renders the brand and security desk eyebrow', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('S-GATE')).toBeTruthy();
      expect(getByText('SECURITY DESK')).toBeTruthy();
    });

    it('greets the guard by first name', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText(/Good to see you,\s*Ravi\./)).toBeTruthy();
    });

    it('shows the avatar initial', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('R')).toBeTruthy();
    });

    it('renders gate name from user', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('North Gate')).toBeTruthy();
    });

    it.each([
      ['MORNING', 'Morning shift'],
      ['EVENING', 'Evening shift'],
      ['NIGHT', 'Night shift'],
    ])('renders the %s shift chip', async (shift, label) => {
      useAuthStore.setState({ user: { ...mockGuard, shift } as any });
      const { getByText } = await renderDashboard();
      expect(getByText(label)).toBeTruthy();
    });

    it('shows "On duty" when no shift is set', async () => {
      useAuthStore.setState({ user: { ...mockGuard, shift: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('On duty')).toBeTruthy();
    });

    it('falls back to "Main Gate" when gate is absent', async () => {
      useAuthStore.setState({ user: { ...mockGuard, gate: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText('Main Gate')).toBeTruthy();
    });

    it('falls back to "Guard" and "G" when name is absent', async () => {
      useAuthStore.setState({ user: { ...mockGuard, name: undefined } as any });
      const { getByText } = await renderDashboard();
      expect(getByText(/Good to see you,\s*Guard\./)).toBeTruthy();
      expect(getByText('G')).toBeTruthy();
    });
  });

  // ── Sections and tiles ──────────────────────────────────────────────────────
  describe('Sections and tiles', () => {
    it('renders section headings', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Gate operations')).toBeTruthy();
      expect(getByText('QUICK ACCESS')).toBeTruthy();
    });

    it('renders primary gate actions', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('New entry')).toBeTruthy();
      expect(getByText('Register a visitor')).toBeTruthy();
      expect(getByText('Scan pass')).toBeTruthy();
      expect(getByText('Verify QR access')).toBeTruthy();
    });

    it('renders the pre-approved passes card', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Pre-approved passes')).toBeTruthy();
      expect(getByText('Cab, delivery and help by flat or vehicle')).toBeTruthy();
    });

    it('renders all quick access tiles', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText("Today's entries")).toBeTruthy();
      expect(getByText('Approvals')).toBeTruthy();
      expect(getByText('Staff check-in')).toBeTruthy();
      expect(getByText('My profile')).toBeTruthy();
    });

    it('renders the emergency card', async () => {
      const { getByText } = await renderDashboard();
      expect(getByText('Emergency assistance')).toBeTruthy();
      expect(getByText('Alert your society response team')).toBeTruthy();
    });
  });

  // ── Navigation ──────────────────────────────────────────────────────────────
  describe('Navigation', () => {
    it.each([
      ['New entry', '/new-entry'],
      ['Scan pass', '/scan-verify'],
      ['Pre-approved passes', '/pre-approved'],
      ["Today's entries", '/today-entries'],
      ['Approvals', '/approvals'],
      ['Staff check-in', '/staff-scan'],
      ['My profile', '/profile'],
      ['Emergency assistance', '/emergencies'],
    ])('pressing "%s" pushes %s', async (label, route) => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText(label));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(route);
    });

    it('pressing the avatar opens the profile', async () => {
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('R'));
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });
  });

  // ── Pending approvals banner ─────────────────────────────────────────────────
  describe('Pending approvals banner', () => {
    it('does NOT show banner when nothing is pending', async () => {
      const { queryByText } = await renderDashboard();
      expect(queryByText(/waiting$/)).toBeNull();
      expect(queryByText('Review resident approvals')).toBeNull();
    });

    it('shows plural banner and approvals badge with the count', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { entries: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }] } },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('3 visitors waiting')).toBeTruthy();
      expect(getByText('Review resident approvals')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('uses the singular for one pending visitor', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: { data: { entries: [{ id: 'e1' }] } } });
      const { getByText } = await renderDashboard();
      expect(getByText('1 visitor waiting')).toBeTruthy();
    });

    it('navigates to /approvals when banner is pressed', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { entries: [{ id: 'e1' }, { id: 'e2' }] } },
      });
      const { getByText } = await renderDashboard();
      fireEvent.press(getByText('2 visitors waiting'));
      expect(mockPush).toHaveBeenCalledWith('/approvals');
    });
  });

  // ── API behaviour ────────────────────────────────────────────────────────────
  describe('API', () => {
    it('fetches pending entry requests on focus', async () => {
      await renderDashboard();
      expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests?status=PENDING');
    });

    it('handles API errors without crashing', async () => {
      (api.get as jest.Mock).mockRejectedValueOnce(new Error('Server error'));
      const { getByText, queryByText } = await renderDashboard();
      expect(getByText('North Gate')).toBeTruthy();
      expect(queryByText('Review resident approvals')).toBeNull();
    });

    it('handles the entryRequests response shape', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { entryRequests: [{ id: 'e1' }, { id: 'e2' }] } },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('2 visitors waiting')).toBeTruthy();
    });

    it('handles a flat array response shape', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ id: 'e1' }, { id: 'e2' }] },
      });
      const { getByText } = await renderDashboard();
      expect(getByText('2 visitors waiting')).toBeTruthy();
    });
  });
});
