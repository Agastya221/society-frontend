import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import api from '@/services/api';

import PreApprovedScreen from '../../app/pre-approved';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

const FLAT = { id: 'flat-1', flatNumber: '101', block: { name: 'A' }, residents: [{ name: 'Meera' }] };

const MATCH = {
  allowed: true, entryId: 'pa-1', type: 'DELIVERY', displayLabel: 'Swiggy delivery',
  isPrivate: false, flatNumber: 'A-101', residentName: 'Meera',
};

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

const postedUrls = () => (api.post as jest.Mock).mock.calls.map((c) => c[0]);

/** Routes GET calls: flat search returns FLAT, the active pass list returns `listed`. */
const mockGets = (listed: unknown[] = []) => {
  (api.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/api/v1/gate/flats/search')) return Promise.resolve({ data: { data: [FLAT] } });
    if (url.startsWith('/api/v1/guard/pre-approved')) return Promise.resolve({ data: { data: { entries: listed } } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const pickFlat = async (utils: ReturnType<typeof render>) => {
  fireEvent.changeText(utils.getByPlaceholderText('Search flat — A-101, B-204…'), 'A-1');
  await waitFor(() => expect(utils.getByText('A-101')).toBeTruthy());
  fireEvent.press(utils.getByText('A-101'));
};

const checkPass = async (utils: ReturnType<typeof render>) => {
  await act(async () => { fireEvent.press(utils.getByText('Check pass')); });
};

describe('PreApprovedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGets();
  });

  // ── Form ────────────────────────────────────────────────────────────────────
  describe('Lookup form', () => {
    it('renders pass types with Delivery selected and flat lookup', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(<PreApprovedScreen />);
      expect(getByText('PASS TYPE')).toBeTruthy();
      expect(getByText('Cab')).toBeTruthy();
      expect(getByText('Delivery')).toBeTruthy();
      expect(getByText('Help')).toBeTruthy();
      expect(getByText('FLAT / UNIT')).toBeTruthy();
      expect(getByPlaceholderText('Search flat — A-101, B-204…')).toBeTruthy();
      // Vehicle lookup is only offered for cabs.
      expect(queryByText('Vehicle number')).toBeNull();
    });

    it('does not check until a flat is picked', async () => {
      const utils = render(<PreApprovedScreen />);
      await checkPass(utils);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('searches flats and shows the resident under each result', async () => {
      const utils = render(<PreApprovedScreen />);
      fireEvent.changeText(utils.getByPlaceholderText('Search flat — A-101, B-204…'), 'A-1');
      await waitFor(() => expect(utils.getByText('A-101')).toBeTruthy());
      expect(api.get).toHaveBeenCalledWith('/api/v1/gate/flats/search?query=A-1');
      expect(utils.getByText('Meera')).toBeTruthy();
    });

    it('validates by flat and type', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: MATCH } });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);

      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { flatId: 'flat-1', type: 'DELIVERY' });
      expect(api.get).toHaveBeenCalledWith('/api/v1/guard/pre-approved?type=DELIVERY&limit=100&flatId=flat-1');
    });

    it('validates a cab by the last 4 digits of the vehicle', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: { ...MATCH, type: 'CAB', isPrivate: true } } });
      const utils = render(<PreApprovedScreen />);
      fireEvent.press(utils.getByText('Cab'));
      fireEvent.press(utils.getByText('Vehicle number'));
      fireEvent.changeText(utils.getByPlaceholderText('e.g. 4521'), 'KA01-4521');
      expect(utils.getByPlaceholderText('e.g. 4521').props.value).toBe('0145');

      fireEvent.changeText(utils.getByPlaceholderText('e.g. 4521'), '4521');
      await checkPass(utils);
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { vehicleLast4: '4521' });
      expect(utils.getByText('Hidden (private pickup)')).toBeTruthy();
    });
  });

  // ── Results ─────────────────────────────────────────────────────────────────
  describe('Results', () => {
    it('shows a valid pass with its window and an Allow entry button', async () => {
      mockGets([{ id: 'pa-1', type: 'DELIVERY', mode: 'ONCE', scheduleType: 'ONCE', displayLabel: 'Swiggy delivery', isPrivate: false, visitorName: 'Raju', schedule: { timeFrom: '09:00', timeTo: '18:00', daysOfWeek: ['MONDAY'] } }]);
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: MATCH } });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);

      expect(utils.getByText('Valid pass')).toBeTruthy();
      expect(utils.getByText('Pre-approved by the resident.')).toBeTruthy();
      expect(utils.getByText('Swiggy delivery')).toBeTruthy();
      expect(utils.getByText('Raju')).toBeTruthy();
      expect(utils.getByText('Mon · 09:00 – 18:00')).toBeTruthy();
      expect(utils.getByText('Allow entry')).toBeTruthy();
      expect(postedUrls()).not.toContain('/api/v1/guard/pre-approved/pa-1/use');
    });

    it('lists several matches with one Allow button each', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { allowed: true, isPrivate: false, matches: [MATCH, { ...MATCH, entryId: 'pa-2', displayLabel: 'Zepto delivery' }] } },
      });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);
      expect(utils.getByText('2 valid passes')).toBeTruthy();
      expect(utils.getAllByText('Allow entry')).toHaveLength(2);
    });

    it('shows reasons and other passes for the flat when denied', async () => {
      mockGets([
        { id: 'pa-1', flatId: 'flat-1', type: 'DELIVERY', mode: 'ONCE', scheduleType: 'ONCE', displayLabel: 'Swiggy delivery', isPrivate: false },
        { id: 'pa-3', flatId: 'flat-1', type: 'DELIVERY', mode: 'ONCE', scheduleType: 'ONCE', displayLabel: 'Amazon delivery', isPrivate: false },
        { id: 'pa-4', flatId: 'flat-other', type: 'DELIVERY', mode: 'ONCE', scheduleType: 'ONCE', displayLabel: 'Other flat delivery', isPrivate: false },
      ]);
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { allowed: false, isPrivate: false, reasons: [{ entryId: 'pa-1', reason: 'EXPIRED' }] } },
      });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);

      expect(utils.getByText('No valid pass')).toBeTruthy();
      expect(utils.getByText('No valid pass found')).toBeTruthy();
      expect(utils.getByText('OTHER PASSES FOR THIS FLAT')).toBeTruthy();
      expect(utils.getByText('Swiggy delivery')).toBeTruthy();
      expect(utils.getByText('Expired')).toBeTruthy();
      expect(utils.getByText('Amazon delivery')).toBeTruthy();
      expect(utils.getByText('Not now')).toBeTruthy();
      expect(utils.queryByText('Other flat delivery')).toBeNull();

      fireEvent.press(utils.getByText('Ask resident instead'));
      expect(mockReplace).toHaveBeenCalledWith('/new-entry');
    });

    it('returns to the form with Check another pass', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: MATCH } });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);
      fireEvent.press(utils.getByText('Check another pass'));
      expect(utils.getByText('PASS TYPE')).toBeTruthy();
    });
  });

  // ── Allow entry ─────────────────────────────────────────────────────────────
  describe('Allow entry', () => {
    const toResult = async (data: unknown = MATCH) => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data } });
      const utils = render(<PreApprovedScreen />);
      await pickFlat(utils);
      await checkPass(utils);
      return utils;
    };

    it('records the entry via /use and shows Entry allowed', async () => {
      const utils = await toResult();
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });

      expect(api.post).toHaveBeenLastCalledWith('/api/v1/guard/pre-approved/pa-1/use', {});
      expect(utils.getByText('Entry allowed')).toBeTruthy();
      expect(utils.queryByText('Allow entry')).toBeNull();
    });

    it('records only one entry when Allow entry is double-tapped', async () => {
      const utils = await toResult();
      const use = deferred<unknown>();
      (api.post as jest.Mock).mockImplementation(() => use.promise);

      const allow = utils.getByText('Allow entry');
      // Both taps land before React re-renders the disabled button.
      act(() => { fireEvent.press(allow); fireEvent.press(allow); });
      expect(postedUrls().filter((u) => u.endsWith('/use'))).toHaveLength(1);
      // While recording, the button shows a spinner instead of the label.
      expect(utils.queryByText('Allow entry')).toBeNull();

      await act(async () => { use.resolve({ data: { success: true } }); });
      expect(postedUrls().filter((u) => u.endsWith('/use'))).toEqual(['/api/v1/guard/pre-approved/pa-1/use']);
      expect(utils.getByText('Entry allowed')).toBeTruthy();
    });

    it('blocks a second pass from being allowed while the first is being recorded', async () => {
      const utils = await toResult({ allowed: true, isPrivate: false, matches: [MATCH, { ...MATCH, entryId: 'pa-2', displayLabel: 'Zepto delivery' }] });
      const use = deferred<unknown>();
      (api.post as jest.Mock).mockImplementation(() => use.promise);

      const [first, second] = utils.getAllByText('Allow entry');
      act(() => { fireEvent.press(first); fireEvent.press(second); });
      await act(async () => { use.resolve({ data: { success: true } }); });

      expect(postedUrls().filter((u) => u.endsWith('/use'))).toEqual(['/api/v1/guard/pre-approved/pa-1/use']);
    });

    it('shows "Pass already used" on a 409', async () => {
      const utils = await toResult();
      (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 409, data: { message: 'Used by another guard' } } });
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });
      expect(utils.getByText('Pass already used')).toBeTruthy();
      expect(utils.getByText('Used by another guard')).toBeTruthy();
    });

    it('allows a retry after a failed /use', async () => {
      const utils = await toResult();
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });
      expect(utils.getByText('Network error. Check the connection and try again.')).toBeTruthy();

      // Back to the form and check again — the busy guard was released.
      fireEvent.press(utils.getByText('Check another pass'));
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: MATCH } });
      await checkPass(utils);
      expect(utils.getByText('Allow entry')).toBeTruthy();
    });
  });
});
