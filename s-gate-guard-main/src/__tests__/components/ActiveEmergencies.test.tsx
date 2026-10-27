import React from 'react';
import { AppState, Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import api from '@/services/api';
import { AppAlert } from '@/components/gate/AppAlert';
import { startAlertSound, stopAlertSound } from '@/services/alertSound';
import { useAuthStore } from '@/store/useAuthStore';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import { useLanguageStore } from '@/i18n';
import { ActiveEmergencies, EMERGENCY_POLL_MS } from '@/components/alerts/ActiveEmergencies';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/alertSound', () => ({ startAlertSound: jest.fn(), stopAlertSound: jest.fn(), playSingleChime: jest.fn() }));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const FIRE = { id: 'e1', type: 'FIRE', description: 'Smoke in the lift lobby', location: 'Tower A', createdAt: minutesAgo(2), respondedAt: null, reportedBy: { id: 'someone-else', name: 'Asha Rao' }, flat: { flatNumber: 'A101' } };

const flush = async () => { await act(async () => {}); };
const mount = async () => { const utils = render(<ActiveEmergencies />); await flush(); return utils; };

describe('ActiveEmergencies (the bar that keeps an emergency on screen)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    useEmergencyStore.setState({ active: [] });
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'me', name: 'Gate Guard', role: 'GUARD' } as never });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [FIRE] } });
    (api.patch as jest.Mock).mockResolvedValue({ data: { success: true } });
    alertSpy = jest.spyOn(AppAlert, 'show').mockImplementation(() => {});
    // the polling timer only asks while the app is on screen
    (AppState as { currentState: string }).currentState = 'active';
  });

  afterEach(() => alertSpy.mockRestore());

  it('shows nothing while no emergency is active', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
    const { queryByTestId } = await mount();
    expect(queryByTestId('emergency-bar')).toBeNull();
  });

  it('shows an active emergency raised by someone else, and rings once for it', async () => {
    const { getByText } = await mount();
    expect(api.get).toHaveBeenCalledWith('/api/v1/guard/emergencies/active');
    expect(getByText('Fire Emergency')).toBeTruthy();
    expect(getByText('Active • Tap to manage')).toBeTruthy();
    expect(startAlertSound).toHaveBeenCalledTimes(1);
  });

  it('does not ring on the phone of the guard who raised it, but still shows it', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ ...FIRE, reportedBy: { id: 'me', name: 'Gate Guard' } }] } });
    const { getByTestId } = await mount();
    expect(getByTestId('emergency-bar')).toBeTruthy();
    expect(startAlertSound).not.toHaveBeenCalled();
  });

  it('does not ring for an old emergency the guard simply had not seen yet', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ ...FIRE, createdAt: minutesAgo(45) }] } });
    const { getByTestId } = await mount();
    expect(getByTestId('emergency-bar')).toBeTruthy();
    expect(startAlertSound).not.toHaveBeenCalled();
  });

  it('opening the bar silences the ring and lists the details', async () => {
    const { getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    expect(stopAlertSound).toHaveBeenCalled();
    expect(getByText('Raised by Asha Rao')).toBeTruthy();
    expect(getByText('Where: Flat A101 · Tower A')).toBeTruthy();
    expect(getByText('Smoke in the lift lobby')).toBeTruthy();
  });

  it('"I\'m responding" tells the server and refreshes', async () => {
    const { getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    (api.get as jest.Mock).mockClear();
    await act(async () => { fireEvent.press(getByText("I'm responding")); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/guard/emergencies/e1/respond', {});
    expect(api.get).toHaveBeenCalled();
  });

  it('resolving asks first, then resolves, and the bar goes away when the server says it is over', async () => {
    const { getByTestId, getByText, queryByTestId } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    await act(async () => { fireEvent.press(getByText('Mark resolved')); });
    expect(api.patch).not.toHaveBeenCalled();
    const [title, , buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Mark as resolved?');
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
    await act(async () => { await buttons[0].onPress(); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/community/emergencies/e1/resolve', {});
    expect(queryByTestId('emergency-bar')).toBeNull();
  });

  it('shows the tower and place, and opens the exact pin in maps', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ ...FIRE, block: { id: 'b1', name: 'Tower A' }, latitude: 22.8046, longitude: 86.2029 }] } });
    const { getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    expect(getByText('Where: Flat A101 · Tower A')).toBeTruthy();
    await act(async () => { fireEvent.press(getByText('Open in maps')); });
    expect(openSpy).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=22.8046,86.2029');
    openSpy.mockRestore();
  });

  it('has no map button when the phone gave no location', async () => {
    const { getByTestId, queryByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    expect(queryByText('Open in maps')).toBeNull();
  });

  it('can call the person who raised it', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ ...FIRE, reportedBy: { id: 'someone-else', name: 'Asha Rao', phone: '9000000601' } }] } });
    const { getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('emergency-bar')); });
    await act(async () => { fireEvent.press(getByText('Call her')); });
    expect(openSpy).toHaveBeenCalledWith('tel:9000000601');
    openSpy.mockRestore();
  });

  it('a harassment alarm also offers the police and the women helpline, and a regular one does not', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ ...FIRE, type: 'HARASSMENT' }] } });
    const harassment = await mount();
    await act(async () => { fireEvent.press(harassment.getByTestId('emergency-bar')); });
    await act(async () => { fireEvent.press(harassment.getByText('Police 112')); });
    await act(async () => { fireEvent.press(harassment.getByText('Women helpline 1091')); });
    expect(openSpy).toHaveBeenCalledWith('tel:112');
    expect(openSpy).toHaveBeenCalledWith('tel:1091');
    harassment.unmount();
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [FIRE] } });
    const fire = await mount();
    await act(async () => { fireEvent.press(fire.getByTestId('emergency-bar')); });
    expect(fire.queryByText('Police 112')).toBeNull();
    openSpy.mockRestore();
  });

  it('keeps asking the server, so an emergency raised from another app turns up (and one resolved elsewhere goes away)', async () => {
    jest.useFakeTimers();
    try {
      (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
      const { queryByTestId, getByTestId } = render(<ActiveEmergencies />);
      await act(async () => {});
      expect(queryByTestId('emergency-bar')).toBeNull();
      (api.get as jest.Mock).mockResolvedValue({ data: { data: [FIRE] } });
      await act(async () => { jest.advanceTimersByTime(EMERGENCY_POLL_MS + 50); });
      expect(getByTestId('emergency-bar')).toBeTruthy();
      (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
      await act(async () => { jest.advanceTimersByTime(EMERGENCY_POLL_MS + 50); });
      expect(queryByTestId('emergency-bar')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps what is on screen when a poll fails', async () => {
    jest.useFakeTimers();
    try {
      const { getByTestId } = render(<ActiveEmergencies />);
      await act(async () => {});
      (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
      await act(async () => { jest.advanceTimersByTime(EMERGENCY_POLL_MS + 50); });
      expect(getByTestId('emergency-bar')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows nothing and asks nothing when signed out', async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    const { queryByTestId } = await mount();
    expect(api.get).not.toHaveBeenCalled();
    expect(queryByTestId('emergency-bar')).toBeNull();
  });
});
