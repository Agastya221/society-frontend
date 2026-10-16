import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

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

const pressClose = (utils: ReturnType<typeof render>) => fireEvent.press(utils.getByTestId('wait-close'));

const waitOutTimeout = () => {
  for (let i = 0; i < 45; i++) act(() => { jest.advanceTimersByTime(1000); });
};

describe('EntryWaitingScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useLanguageStore.setState({ lang: 'en' });
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
    expect(getByText('Notifying resident')).toBeTruthy();
    expect(getByText('Asha Rao')).toBeTruthy();
    expect(getByText('Guest')).toBeTruthy();
    expect(getByText('Flat Tower A-A101')).toBeTruthy();
    expect(getByText('Waiting for the resident…')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1');
  });

  it('shows a small notice when the request went without the photo', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ ...PARAMS, photoSkipped: '1' });
    const { getByText } = await renderScreen();
    expect(getByText('Photo could not upload — sent without it')).toBeTruthy();
    expect(getByText('Notifying resident')).toBeTruthy();
  });

  it('speaks Hindi for guards by default', async () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getByText } = await renderScreen();
    expect(getByText('निवासी को बताया जा रहा है')).toBeTruthy();
    expect(getByText('अगला विज़िटर')).toBeTruthy();
  });

  it('counts down the seconds left', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('45s remaining')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(getByText('40s remaining')).toBeTruthy();
  });

  it('shows ready for entry when polling sees APPROVED', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { status: 'APPROVED' } } });
    const { getByText } = await renderScreen();
    expect(getByText('Approved at gate')).toBeTruthy();
    expect(getByText('Let in now')).toBeTruthy();
    expect(getByText('Asha Rao')).toBeTruthy();
    expect(getByText('Flat Tower A-A101')).toBeTruthy();
    expect(getByText('Guest')).toBeTruthy();
  });

  it('polls only this request and backs off 3 s → 6 s → 12 s on errors (429), keeping the screen', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 429 } });
    const tick = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
    const { getByText } = await renderScreen();
    expect(api.get).toHaveBeenCalledTimes(1);           // t=0, 1st failure → wait 3 s
    await tick(3000);
    expect(api.get).toHaveBeenCalledTimes(2);           // t=3, 2nd failure → wait 6 s
    await tick(5900);
    expect(api.get).toHaveBeenCalledTimes(2);
    await tick(100);
    expect(api.get).toHaveBeenCalledTimes(3);           // t=9, 3rd failure → wait 12 s
    await tick(11900);
    expect(api.get).toHaveBeenCalledTimes(3);
    await tick(100);
    expect(api.get).toHaveBeenCalledTimes(4);           // t=21, capped at 12 s
    // Only the single-request endpoint — no fallback list calls on error.
    for (const [url] of (api.get as jest.Mock).mock.calls) expect(url).toBe('/api/v1/gate/entry-requests/er-1');
    expect(getByText('Notifying resident')).toBeTruthy();

    // A success resets the delay to 3 s.
    (api.get as jest.Mock).mockResolvedValue(pending);
    await tick(12000);
    expect(api.get).toHaveBeenCalledTimes(5);
    await tick(3000);
    expect(api.get).toHaveBeenCalledTimes(6);
  });

  it('does not mark the person inside until the guard confirms entry', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { status: 'APPROVED' } } });
    const utils = await renderScreen();
    act(() => { jest.advanceTimersByTime(8100); });
    expect(mockRouter.dismissAll).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(utils.getByText('Let in now')); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1/admit');
    expect(utils.getByText('Let in')).toBeTruthy();
  });

  it('opens a fresh New visitor from the result', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { status: 'APPROVED' } } });
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('Next visitor'));
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/new-entry');
  });

  describe('No answer', () => {
    it('switches to "No response" after the timeout and offers the override buttons', async () => {
      const { getByText } = await renderScreen();
      waitOutTimeout();
      expect(getByText('No response')).toBeTruthy();
      expect(getByText('No response after 45s')).toBeTruthy();
      expect(getByText('Let in anyway')).toBeTruthy();
      expect(getByText('Send away')).toBeTruthy();
    });

    it('does not show the override buttons while waiting', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('Let in anyway')).toBeNull();
      expect(queryByText('Send away')).toBeNull();
    });

    it('lets the guard allow anyway', async () => {
      const utils = await renderScreen();
      waitOutTimeout();
      await act(async () => { fireEvent.press(utils.getByText('Let in anyway')); });
      expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1/approve');
      expect(utils.getByText('Let in now')).toBeTruthy();
    });

    it('lets the guard send the visitor away', async () => {
      const utils = await renderScreen();
      waitOutTimeout();
      await act(async () => { fireEvent.press(utils.getByText('Send away')); });
      expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/er-1/reject');
      expect(utils.getByText('Ask the visitor to leave')).toBeTruthy();
    });

    it('tells the guard when the override fails and keeps the buttons', async () => {
      (api.patch as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Already handled' } } });
      const utils = await renderScreen();
      waitOutTimeout();
      await act(async () => { fireEvent.press(utils.getByText('Let in anyway')); });
      expect(alertSpy).toHaveBeenCalledWith('Could not update entry', 'Already handled');
      expect(utils.getByText('Let in anyway')).toBeTruthy();
    });
  });

  describe('Cancel flow', () => {
    it('asks for confirmation before cancelling', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      expect(alertSpy).toHaveBeenCalledWith('Cancel request?', expect.any(String), expect.any(Array));
      expect(lastAlertButtons(alertSpy).map((b) => b.text)).toEqual(['Keep waiting', 'Cancel request']);
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('keeps waiting when the guard chooses Keep waiting', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      const keep = lastAlertButtons(alertSpy).find((b) => b.text === 'Keep waiting')!;
      keep.onPress?.();
      expect(api.patch).not.toHaveBeenCalled();
      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expect(utils.getByText('Notifying resident')).toBeTruthy();
    });

    it('cancels the request and returns to the dashboard', async () => {
      const utils = await renderScreen();
      pressClose(utils);
      const cancel = lastAlertButtons(alertSpy).find((b) => b.text === 'Cancel request')!;
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
      const cancel = lastAlertButtons(alertSpy).find((b) => b.text === 'Cancel request')!;
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
      expect(alertSpy).toHaveBeenCalledWith('Cancel request?', expect.any(String), expect.any(Array));
      addSpy.mockRestore();
    });
  });

  it('Next visitor leaves the request pending and opens a fresh New visitor', async () => {
    const utils = await renderScreen();
    fireEvent.press(utils.getByText('Next visitor'));
    expect(api.patch).not.toHaveBeenCalled();
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/new-entry');
  });

  it('shows the untracked state when there is no request id', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ ...PARAMS, id: '' });
    const utils = await renderScreen();
    expect(utils.getByText('Entry submitted')).toBeTruthy();
    fireEvent.press(utils.getByText('Open waiting list'));
    expect(mockRouter.push).toHaveBeenCalledWith('/approvals');
  });
});
