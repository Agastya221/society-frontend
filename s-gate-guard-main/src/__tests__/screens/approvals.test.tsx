import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import ApprovalsScreen from '../../app/approvals';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

const WAITING = [
  { id: 'e1', visitorName: 'Asha Rao', type: 'VISITOR', flat: { flatNumber: 'A101', resident: { name: 'Meera' } }, createdAt: ago(0), status: 'PENDING' },
  { id: 'e2', visitorName: '', type: 'DELIVERY', flatNumber: 'B204', createdAt: ago(5), status: 'PENDING' },
];

const renderScreen = async () => {
  const utils = render(<ApprovalsScreen />);
  await act(async () => {});
  return utils;
};

type AlertButton = { text: string; onPress?: () => void | Promise<void> };
const lastAlertButtons = (spy: jest.SpyInstance): AlertButton[] => spy.mock.calls[spy.mock.calls.length - 1][2];

describe('ApprovalsScreen (waiting list)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { entries: WAITING } } });
    (api.patch as jest.Mock).mockResolvedValue({});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('lists each waiting visitor with flat, resident and how long they waited', async () => {
    const { getByText, getAllByText } = await renderScreen();
    expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests?status=PENDING');
    expect(getByText('Asha Rao')).toBeTruthy();
    expect(getByText('Flat A101 · Meera')).toBeTruthy();
    expect(getByText('Just arrived')).toBeTruthy();
    // A visitor without a name falls back to their kind.
    expect(getAllByText('Delivery').length).toBeGreaterThan(0);
    expect(getByText('For 5 min')).toBeTruthy();
  });

  it('speaks Hindi by default for guards', async () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getAllByText } = await renderScreen();
    expect(getAllByText('अंदर जाने दें').length).toBe(2);
    expect(getAllByText('रोकें').length).toBe(2);
  });

  it('shows the all-clear state when nobody is waiting', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { entries: [] } } });
    const { getByText } = await renderScreen();
    expect(getByText('All clear')).toBeTruthy();
  });

  it('understands the entryRequests and flat array response shapes', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { entryRequests: [WAITING[0]] } } });
    const first = await renderScreen();
    expect(first.getByText('Asha Rao')).toBeTruthy();
    first.unmount();

    (api.get as jest.Mock).mockResolvedValue({ data: { data: [WAITING[0]] } });
    const second = await renderScreen();
    expect(second.getByText('Asha Rao')).toBeTruthy();
  });

  it('lets a visitor in and removes the card', async () => {
    const { getAllByText, queryByText } = await renderScreen();
    await act(async () => { fireEvent.press(getAllByText('Let in')[0]); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/e1/approve');
    expect(queryByText('Asha Rao')).toBeNull();
  });

  it('records only one approval on a double tap', async () => {
    const { getAllByText } = await renderScreen();
    const allow = getAllByText('Let in')[0];
    await act(async () => { fireEvent.press(allow); fireEvent.press(allow); });
    expect((api.patch as jest.Mock).mock.calls.filter((c) => String(c[0]).endsWith('/approve'))).toHaveLength(1);
  });

  it('asks before stopping a visitor, then rejects', async () => {
    const { getAllByText, queryByText } = await renderScreen();
    fireEvent.press(getAllByText('Stop')[0]);
    expect(alertSpy).toHaveBeenCalledWith('Stop this visitor?', expect.any(String), expect.any(Array));
    expect(api.patch).not.toHaveBeenCalled();
    const stop = lastAlertButtons(alertSpy).find((b) => b.text === 'Stop')!;
    await act(async () => { await stop.onPress?.(); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/e1/reject');
    expect(queryByText('Asha Rao')).toBeNull();
  });

  it('keeps the visitor when the guard cancels the stop', async () => {
    const { getAllByText, getByText } = await renderScreen();
    fireEvent.press(getAllByText('Stop')[0]);
    const cancel = lastAlertButtons(alertSpy).find((b) => b.text === 'Cancel')!;
    cancel.onPress?.();
    expect(api.patch).not.toHaveBeenCalled();
    expect(getByText('Asha Rao')).toBeTruthy();
  });

  it('shows the server message and refreshes when approving fails', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Already answered' } } });
    const { getAllByText } = await renderScreen();
    (api.get as jest.Mock).mockClear();
    await act(async () => { fireEvent.press(getAllByText('Let in')[0]); });
    expect(alertSpy).toHaveBeenCalledWith('Failed', 'Already answered');
    expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests?status=PENDING');
  });

  it('has a Home button', async () => {
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('Home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
