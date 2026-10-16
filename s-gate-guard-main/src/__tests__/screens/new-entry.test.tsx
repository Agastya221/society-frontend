import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import NewEntryScreen from '../../app/new-entry';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

const FLAT = { id: 'flat-1', flatNumber: 'A101', block: { name: 'Tower A' }, residents: [{ name: 'Meera' }] };
const FLAT_LABEL = 'Tower A-A101';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

type Utils = ReturnType<typeof render>;

const pickType = (utils: Utils, type: string) => fireEvent.press(utils.getByTestId(`type-${type}`));

const typeFlat = (utils: Utils, text: string) => fireEvent.changeText(utils.getByTestId('flat-input'), text);

/** Types part of a flat number, waits for the result tile and taps it. */
const pickFlat = async (utils: Utils) => {
  await waitFor(() => expect(utils.getByTestId('flat-flat-1')).toBeTruthy());
  await act(async () => { fireEvent.press(utils.getByTestId('flat-flat-1')); });
};

const entryPosts = () => (api.post as jest.Mock).mock.calls.filter((c) => c[0] === '/api/v1/gate/entry-requests');

/** Guest → flat → on the "tell the resident" step. */
const toNotifyStep = async (utils: Utils, type = 'GUEST') => {
  pickType(utils, type);
  if (type === 'SERVICE') fireEvent.press(utils.getByTestId('service-PLUMBER'));
  if (type === 'CAB') fireEvent.press(utils.getByText('No digits? Choose flat'));
  await pickFlat(utils);
  if (type === 'DELIVERY') fireEvent.press(utils.getByTestId('provider-SWIGGY'));
  await waitFor(() => expect(utils.getByText('Notify resident')).toBeTruthy());
};

describe('NewEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.includes('/gate/flats?') ? { flats: [FLAT], pagination: { pages: 1 } } : [FLAT],
    } }));
    (api.post as jest.Mock).mockResolvedValue({ data: { data: { entryRequest: { id: 'er-1' } } } });
  });

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  describe('Who is it', () => {
    it('shows the six visitor kinds as big tiles', () => {
      const { getByText } = render(<NewEntryScreen />);
      expect(getByText('Who is it?')).toBeTruthy();
      for (const label of ['Guest', 'Delivery', 'Cab', 'Daily help', 'Service', 'Other']) expect(getByText(label)).toBeTruthy();
    });

    it('speaks Hindi by default', () => {
      useLanguageStore.setState({ lang: 'hi' });
      const { getByText } = render(<NewEntryScreen />);
      expect(getByText('कौन आया है?')).toBeTruthy();
      expect(getByText('मेहमान')).toBeTruthy();
    });

    it('moves straight on to the flat step when a kind is tapped', () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      expect(utils.getByText('Which flat?')).toBeTruthy();
    });

    it('keeps delivery company on the same quick details screen', async () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'DELIVERY');
      expect(utils.getByText('Which flat?')).toBeTruthy();
      await pickFlat(utils);
      expect(utils.getByText('From which company?')).toBeTruthy();
      fireEvent.press(utils.getByTestId('provider-SWIGGY'));
      await waitFor(() => expect(utils.getByText('Notify resident')).toBeTruthy());
    });
  });

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  describe('Which flat', () => {
    it('lets the guard type the flat in a big field and searches as it goes', async () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      fireEvent.press(utils.getByTestId('toggle-flat-search'));
      typeFlat(utils, 'a10');
      expect(utils.getByTestId('flat-input').props.value).toBe('A10');
      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/gate/flats/search?query=A10'));
      expect(utils.getByText('Meera')).toBeTruthy();
    });

    it('keeps only letters, digits and dashes in the typed flat', () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      fireEvent.press(utils.getByTestId('toggle-flat-search'));
      typeFlat(utils, 'a-1 0/1');
      expect(utils.getByTestId('flat-input').props.value).toBe('A-101');
    });

    it('says when no flat matches', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      fireEvent.press(utils.getByTestId('toggle-flat-search'));
      typeFlat(utils, 'Z9');
      await waitFor(() => expect(utils.getByText('No flats found')).toBeTruthy());
    });

    it('goes back one step with the back button', () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      fireEvent.press(utils.getByTestId('step-back'));
      expect(utils.getByText('Who is it?')).toBeTruthy();
    });

    it('leaves the screen from the first step', () => {
      const utils = render(<NewEntryScreen />);
      fireEvent.press(utils.getByTestId('step-back'));
      expect(mockBack).toHaveBeenCalled();
    });

    it('offers recently used flats', async () => {
      const first = render(<NewEntryScreen />);
      await toNotifyStep(first);
      first.unmount();

      const second = render(<NewEntryScreen />);
      pickType(second, 'GUEST');
      expect(second.getByText('Recent')).toBeTruthy();
      expect(second.getByText(FLAT_LABEL)).toBeTruthy();
    });
  });

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  describe('Tell the resident', () => {
    it('shows what is being sent and where', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      expect(utils.getByText('Tell the resident')).toBeTruthy();
      expect(utils.getByText(FLAT_LABEL)).toBeTruthy();
      expect(utils.getByText('Photo (optional)')).toBeTruthy();
      expect(utils.getByText('Notify resident')).toBeTruthy();
    });

    it('sends a guest request with no name when none is added', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()).toHaveLength(1);
      expect(entryPosts()[0][1]).toEqual({ type: 'VISITOR', flatId: 'flat-1' });
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
        pathname: '/entry-waiting',
        params: expect.objectContaining({ id: 'er-1', flat: FLAT_LABEL, type: 'GUEST' }),
      }));
    });

    it('sends a trimmed, collapsed visitor name', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      fireEvent.changeText(utils.getByPlaceholderText('Name shown to the resident'), '  Asha   Rao ');
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).toEqual({ type: 'VISITOR', flatId: 'flat-1', visitorName: 'Asha Rao' });
    });

    it('leaves the name out when it is blank', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      fireEvent.changeText(utils.getByPlaceholderText('Name shown to the resident'), '   ');
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).not.toHaveProperty('visitorName');
    });

    it('sends the delivery company', async () => {
      const utils = render(<NewEntryScreen />);
      (api.post as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('pre-approved/validate')) return Promise.resolve({ data: { data: { allowed: false, isPrivate: false } } });
        return Promise.resolve({ data: { data: { entryRequest: { id: 'er-1' } } } });
      });
      await toNotifyStep(utils, 'DELIVERY');
      expect(utils.getByText('From which company?')).toBeTruthy();
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).toEqual({ type: 'DELIVERY', flatId: 'flat-1', providerTag: 'SWIGGY' });
    });

    it('maps service visitors to the VENDOR type', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils, 'SERVICE');
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).toEqual({ type: 'VENDOR', flatId: 'flat-1', purpose: 'PLUMBER' });
    });

    it('submits only once on a double tap', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      const pending = deferred<unknown>();
      (api.post as jest.Mock).mockImplementation(() => pending.promise);
      const submit = utils.getByText('Notify resident');
      act(() => { fireEvent.press(submit); fireEvent.press(submit); });
      expect(entryPosts()).toHaveLength(1);
      await act(async () => { pending.resolve({ data: { data: { entryRequest: { id: 'er-1' } } } }); });
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('shows an alert and stays on the step when the request fails', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils);
      (api.post as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Flat has no residents' } } });
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(alert).toHaveBeenCalledWith('Failed', 'Flat has no residents');
      expect(mockPush).not.toHaveBeenCalled();
      expect(utils.getByText('Notify resident')).toBeTruthy();
      alert.mockRestore();
    });
  });

  // ── Pre-approval shortcut ───────────────────────────────────────────────────
  describe('Pre-approved cab / delivery / help', () => {
    const validMatch = { allowed: true, entryId: 'pa-1', type: 'CAB', displayLabel: 'Uber pickup', isPrivate: false, flatNumber: 'A101' };

    const mockValidate = (data: unknown) => {
      (api.post as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/v1/guard/pre-approved/validate') return Promise.resolve({ data: { data } });
        if (url.endsWith('/use')) return Promise.resolve({ data: { success: true } });
        return Promise.resolve({ data: { data: { entryRequest: { id: 'er-1' } } } });
      });
    };

    it('checks for a pass for a cab and lets the guard allow it without asking the resident', async () => {
      mockValidate(validMatch);
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'CAB');
      fireEvent.press(utils.getByText('No digits? Choose flat'));
      await pickFlat(utils);

      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { flatId: 'flat-1', type: 'CAB' });
      expect(utils.getByText('Valid pass')).toBeTruthy();
      expect(utils.getByText('Uber pickup')).toBeTruthy();

      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/pa-1/use', {});
      expect(utils.getByText('Let in')).toBeTruthy();
      expect(entryPosts()).toHaveLength(0);
    });

    it('carries on to the resident request when there is no pass', async () => {
      mockValidate({ allowed: false, isPrivate: false, message: 'No pass' });
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'CAB');
      fireEvent.press(utils.getByText('No digits? Choose flat'));
      await pickFlat(utils);
      expect(utils.getByText('Tell the resident')).toBeTruthy();
    });

    it('carries on when the pass check itself fails', async () => {
      (api.post as jest.Mock).mockImplementation((url: string) => (
        url.includes('pre-approved/validate') ? Promise.reject(new Error('Network Error')) : Promise.resolve({ data: { data: {} } })
      ));
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'SERVICE');
      fireEvent.press(utils.getByTestId('service-PLUMBER'));
      await pickFlat(utils);
      expect(utils.getByText('Tell the resident')).toBeTruthy();
    });

    it('lets the guard ask the resident instead of using the pass', async () => {
      mockValidate(validMatch);
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'CAB');
      fireEvent.press(utils.getByText('No digits? Choose flat'));
      await pickFlat(utils);
      fireEvent.press(utils.getByText('Ask the resident'));
      expect(utils.getByText('Tell the resident')).toBeTruthy();
    });

    it('never checks for a pass for a guest', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils, 'GUEST');
      expect(api.post).not.toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', expect.anything());
    });

    it('shows "Pass already used" when another guard used it first', async () => {
      mockValidate(validMatch);
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'CAB');
      fireEvent.press(utils.getByText('No digits? Choose flat'));
      await pickFlat(utils);
      (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 409, data: { message: 'Already used at 10:02' } } });
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });
      expect(utils.getByText('Pass already used')).toBeTruthy();
      expect(utils.getByText('Already used at 10:02')).toBeTruthy();
    });

    it('checks a private cab by vehicle digits before asking for a flat', async () => {
      mockValidate({ allowed: true, entryId: 'safe-1', type: 'CAB', mode: 'SAFE', displayLabel: 'Cab Pickup', isPrivate: true });
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'CAB');
      fireEvent.changeText(utils.getByTestId('cab-last4'), '4521');
      await act(async () => { fireEvent.press(utils.getByText('Check cab pass')); });
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { vehicleLast4: '4521' });
      expect(utils.getByText('Valid pass')).toBeTruthy();
      expect(utils.queryByText('Which flat?')).toBeNull();
    });

    it('matches a service against the resident category', async () => {
      mockValidate({ allowed: false, isPrivate: false });
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'SERVICE');
      fireEvent.press(utils.getByTestId('service-PLUMBER'));
      await pickFlat(utils);
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { flatId: 'flat-1', type: 'HELP', category: 'PLUMBER' });
    });
  });

  describe('Distinct no-QR categories', () => {
    it('sends registered daily help to the staff scanner', () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'HELP');
      fireEvent.press(utils.getByText('Scan staff pass'));
      expect(mockReplace).toHaveBeenCalledWith('/scan-verify');
    });

    it('asks the resident for an unregistered helper', async () => {
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'HELP');
      fireEvent.press(utils.getByText('No pass? Ask resident'));
      await pickFlat(utils);
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).toEqual({ type: 'VISITOR', flatId: 'flat-1', purpose: 'Unregistered daily help' });
    });

    it('includes an optional reason for Other visitors', async () => {
      const utils = render(<NewEntryScreen />);
      await toNotifyStep(utils, 'OTHER');
      fireEvent.changeText(utils.getByPlaceholderText('For example, deliver documents'), '  Drop documents  ');
      await act(async () => { fireEvent.press(utils.getByText('Notify resident')); });
      expect(entryPosts()[0][1]).toEqual({ type: 'VISITOR', flatId: 'flat-1', purpose: 'Drop documents' });
    });
  });

  // ── Hardware back ───────────────────────────────────────────────────────────
  describe('Hardware back', () => {
    it('steps back instead of leaving a half-filled visitor', () => {
      let handler: (() => boolean) | undefined;
      const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, cb: () => boolean) => {
        handler = cb;
        return { remove: jest.fn() };
      }) as any);
      const utils = render(<NewEntryScreen />);
      pickType(utils, 'GUEST');
      expect(utils.getByText('Which flat?')).toBeTruthy();
      act(() => { handler?.(); });
      expect(utils.getByText('Who is it?')).toBeTruthy();
      spy.mockRestore();
    });
  });
});
