import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';

import EntryWaitingScreen from '../../app/entry-waiting';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(),
}));

const PARAMS = { id: 'er-1', flat: 'Tower A-A101', name: 'Asha Rao', type: 'GUEST', photo: '' };

const pending = { data: { data: { status: 'PENDING' } } };

type AlertButton = { text: string; onPress?: () => void | Promise<void> };
const lastAlertButtons = (spy: jest.SpyInstance): AlertButton[] => spy.mock.calls[spy.mock.calls.length - 1][2];

const renderScreen = async () => {
  const utils = render(<EntryWaitingScreen />);
  await act(async () => {});
  return utils;
};

const pressClose = (utils: ReturnType<typeof render>) =>
  fireEvent.press(utils.UNSAFE_getByProps({ name: 'close', size: 22 }));

describe('EntryWaitingScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useLocalSearchParams as jest.Mock).mockReturnValue(PARAMS);
    (api.get as jest.Mock).mockResolvedValue(pending);
    (api.patch as jest.Mock).mockResolvedValue({});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  it('shows the visitor while notifying the resident', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Notifying Resident')).toBeTruthy();
    expect(getByText('Asha Rao')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1');
  });

  it('shows the approved result when polling sees APPROVED', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { status: 'APPROVED' } } });
    const { getByText } = await renderScreen();
    expect(getByText('Entry Approved')).toBeTruthy();
    expect(getByText('Asha Rao · Guest')).toBeTruthy();
    expect(getByText('Flat Tower A-A101')).toBeTruthy();
  });

  it('falls back to the pending list (flat array shape) when the single lookup fails', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/v1/gate/entry-requests/er-1') return Promise.reject(new Error('404'));
      if (url === '/api/v1/gate/entry-requests?status=PENDING') {
        return Promise.resolve({ data: { data: [{ id: 'er-1', status: 'REJECTED' }] } });
      }
      return Promise.resolve({ data: { data: { entries: [] } } });
    });
    const { getByText } = await renderScreen();
    expect(getByText('Entry Denied')).toBeTruthy();
  });

  it('switches to "No Response" after the timeout', async () => {
    const { getByText } = await renderScreen();
    for (let i = 0; i < 45; i++) act(() => { jest.advanceTimersByTime(1000); });
    expect(getByText('No Response')).toBeTruthy();
  });

  describe('Cancel flow', () => {
    it('asks for confirmation before cancelling', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      expect(alertSpy).toHaveBeenCalledWith('Cancel Request?', expect.any(String), expect.any(Array));
      expect(lastAlertButtons(alertSpy).map((b) => b.text)).toEqual(['Keep Waiting', 'Cancel Request']);
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('keeps waiting when the guard chooses Keep Waiting', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      const keep = lastAlertButtons(alertSpy).find((b) => b.text === 'Keep Waiting')!;
      keep.onPress?.();
      expect(api.patch).not.toHaveBeenCalled();
      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expect(utils.getByText('Notifying Resident')).toBeTruthy();
    });

    it('cancels the request and returns to the dashboard', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      const cancel = lastAlertButtons(alertSpy).find((b) => b.text === 'Cancel Request')!;
      await act(async () => { await cancel.onPress?.(); });

      expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1/cancel');
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).not.toHaveBeenCalled();

      // Polling stops after cancelling.
      (api.get as jest.Mock).mockClear();
      act(() => { jest.advanceTimersByTime(9000); });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('still leaves the screen when the cancel call fails', async () => {
      (api.patch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
      const utils = await renderScreen();
      pressClose(utils);
      const cancel = lastAlertButtons(alertSpy).find((b) => b.text === 'Cancel Request')!;
      await act(async () => { await cancel.onPress?.(); });
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
    });

    it('Android back while waiting asks before cancelling', async () => {
      const handlers: (() => boolean)[] = [];
      const addSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h: any) => {
        handlers.push(h);
        return { remove: jest.fn() } as any;
      });
      await renderScreen();
      const handled = handlers[handlers.length - 1]();
      expect(handled).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith('Cancel Request?', expect.any(String), expect.any(Array));
      addSpy.mockRestore();
    });
  });

  it('Next leaves the request pending and opens a fresh New Entry', async () => {
    const utils = await renderScreen();
    // The first "Next" is the top-bar button; the second is bold text in the hint strip.
    fireEvent.press(utils.getAllByText('Next')[0]);
    expect(api.patch).not.toHaveBeenCalled();
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/new-entry');
  });

  it('shows the untracked state when there is no request id', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ ...PARAMS, id: '' });
    const utils = await renderScreen();
    expect(utils.getByText('Entry submitted')).toBeTruthy();
    fireEvent.press(utils.getByText('Go to Approvals'));
    expect(mockRouter.push).toHaveBeenCalledWith('/approvals');
  });
});
