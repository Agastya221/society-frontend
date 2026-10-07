import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { Linking } from 'react-native';
import api from '@/services/api';

import ScanVerifyScreen from '../../app/scan-verify';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: unknown) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`;

const PRE_APPROVED_QR = jwt({ type: 'pre_approved', entryId: 'pa-1' });
const GATE_PASS_QR = jwt({ type: 'gate_pass', passId: 'gp-1' });

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const renderScreen = () => render(<ScanVerifyScreen />);

const scan = async (utils: ReturnType<typeof renderScreen>, data: string) => {
  const camera = utils.UNSAFE_getByType('CameraView' as any);
  expect(typeof camera.props.onBarcodeScanned).toBe('function');
  await act(async () => { camera.props.onBarcodeScanned({ data }); });
};

const enterCode = async (utils: ReturnType<typeof renderScreen>, code: string) => {
  fireEvent.press(utils.getByText('Enter code instead'));
  fireEvent.changeText(utils.getByPlaceholderText('e.g. K7M2QX'), code);
  await act(async () => { fireEvent.press(utils.getByText('Verify')); });
};

const postedUrls = () => (api.post as jest.Mock).mock.calls.map((c) => c[0]);

describe('ScanVerifyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
  });

  // ── Camera permission ───────────────────────────────────────────────────────
  describe('Camera permission', () => {
    it('asks for camera access when not granted', () => {
      const request = jest.fn();
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false, canAskAgain: true }, request]);
      const { getByText } = renderScreen();
      expect(getByText('Camera Access Needed')).toBeTruthy();
      fireEvent.press(getByText('Allow Camera'));
      expect(request).toHaveBeenCalled();
    });

    it('sends the guard to Settings when the prompt can no longer be shown', () => {
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as any);
      const request = jest.fn();
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false, canAskAgain: false }, request]);
      const { getByText } = renderScreen();
      fireEvent.press(getByText('Allow Camera'));
      expect(openSettings).toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
      openSettings.mockRestore();
    });

    it('renders the scanner when access is granted', () => {
      const { getByText } = renderScreen();
      expect(getByText('Scan QR Code')).toBeTruthy();
      expect(getByText('Point camera at a visitor or staff QR code')).toBeTruthy();
    });
  });

  // ── Passcode vs QR routing ──────────────────────────────────────────────────
  describe('Code routing', () => {
    it('sends a manually entered 6-char passcode to /guard/verify-code (uppercased)', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { allowed: true, visitorName: 'Asha', flatNumber: 'A-101', inviteType: 'GUEST' } },
      });
      const utils = renderScreen();
      await enterCode(utils, 'k7m2qx');

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/verify-code', { code: 'K7M2QX' });
      expect(postedUrls()).not.toContain('/api/v1/guard/scan');
      expect(utils.getByText('Entry Allowed')).toBeTruthy();
      expect(utils.getByText('Asha')).toBeTruthy();
      expect(utils.getByText('A-101')).toBeTruthy();
      expect(utils.getByText('GUEST')).toBeTruthy();
    });

    it('sends a scanned 6-char passcode QR to /guard/verify-code', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: { allowed: true } } });
      const utils = renderScreen();
      await scan(utils, ' ab12cd ');
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/verify-code', { code: 'AB12CD' });
      expect(postedUrls()).not.toContain('/api/v1/guard/scan');
    });

    it('sends a signed QR token to /guard/scan', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { type: 'GATE_PASS', allowed: true, pass: { visitorName: 'Asha', flat: { flatNumber: 'B-204' }, mode: 'NORMAL' } } },
      });
      const utils = renderScreen();
      await scan(utils, GATE_PASS_QR);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/scan', { qrToken: GATE_PASS_QR });
      expect(postedUrls()).not.toContain('/api/v1/guard/verify-code');
      expect(utils.getByText('Entry Allowed')).toBeTruthy();
      expect(utils.getByText('B-204')).toBeTruthy();
      expect(utils.getByText('GATE PASS')).toBeTruthy();
      // NORMAL mode is not shown
      expect(utils.queryByText('Mode')).toBeNull();
    });

    it('sends codes that are not exactly 6 alphanumerics to /guard/scan', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: { success: true, data: { type: 'GATE_PASS', allowed: false } } });
      const utils = renderScreen();
      await enterCode(utils, 'K7M2QX9');
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/scan', { qrToken: 'K7M2QX9' });
    });

    it('strips non-alphanumerics from the manual code input', () => {
      const utils = renderScreen();
      fireEvent.press(utils.getByText('Enter code instead'));
      fireEvent.changeText(utils.getByPlaceholderText('e.g. K7M2QX'), 'k7-m2 qx');
      expect(utils.getByPlaceholderText('e.g. K7M2QX').props.value).toBe('K7M2QX');
    });

    it('shows the denial reason from verify-code', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: false, message: 'Pass expired', data: { allowed: false } },
      });
      const utils = renderScreen();
      await enterCode(utils, 'K7M2QX');
      expect(utils.getByText('Entry Denied')).toBeTruthy();
      expect(utils.getByText('Pass expired')).toBeTruthy();
    });

    it('shows the server message when /guard/scan rejects', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 400, data: { message: 'Invalid or expired QR' } } });
      const utils = renderScreen();
      await scan(utils, GATE_PASS_QR);
      expect(utils.getByText('Entry Denied')).toBeTruthy();
      expect(utils.getByText('Invalid or expired QR')).toBeTruthy();
    });

    it('shows a network error when there is no response', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
      const utils = renderScreen();
      await enterCode(utils, 'K7M2QX');
      expect(utils.getByText('Network error. Check the connection and try again.')).toBeTruthy();
    });

    it('labels a staff scan as a check-in / check-out', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { type: 'DOMESTIC_STAFF', allowed: true, pass: { name: 'Sunita', staffType: 'HOUSE_HELP', isCurrentlyWorking: true, attendanceAction: 'CHECKED_IN' } } },
      });
      const utils = renderScreen();
      await scan(utils, 'staff-token-xyz');
      expect(utils.getByText('Staff Checked In')).toBeTruthy();
      expect(utils.getByText('Sunita')).toBeTruthy();
      expect(utils.getByText('HOUSE HELP')).toBeTruthy();
      expect(utils.getByText('Checked in')).toBeTruthy();
    });

    it('ignores further scans while a result is shown, and accepts them after Scan Again', async () => {
      jest.useFakeTimers();
      try {
        (api.post as jest.Mock).mockResolvedValue({ data: { success: true, data: { allowed: true } } });
        const utils = renderScreen();
        await scan(utils, 'AAAAAA');
        expect(api.post).toHaveBeenCalledTimes(1);

        // Camera callback is detached while the result card is up.
        expect(utils.UNSAFE_getByType('CameraView' as any).props.onBarcodeScanned).toBeUndefined();

        fireEvent.press(utils.getByText('Scan Again'));
        act(() => { jest.advanceTimersByTime(800); });
        await scan(utils, 'BBBBBB');
        expect(api.post).toHaveBeenCalledTimes(2);
        expect(api.post).toHaveBeenLastCalledWith('/api/v1/guard/verify-code', { code: 'BBBBBB' });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ── Pre-approved QR ─────────────────────────────────────────────────────────
  describe('Pre-approved QR', () => {
    const validMatch = {
      allowed: true, entryId: 'pa-1', type: 'DELIVERY', displayLabel: 'Swiggy delivery',
      isPrivate: false, flatNumber: 'A-101', residentName: 'Meera',
    };

    const mockValidate = (data: unknown) => {
      (api.post as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/v1/guard/pre-approved/validate') return Promise.resolve({ data: { data } });
        return Promise.reject(new Error(`unexpected POST ${url}`));
      });
      (api.get as jest.Mock).mockResolvedValue({
        data: { data: { entries: [{ id: 'pa-1', type: 'DELIVERY', mode: 'ONCE', scheduleType: 'ONCE', displayLabel: 'Swiggy delivery', isPrivate: false, visitorName: 'Raju', schedule: { timeFrom: '09:00', timeTo: '18:00' } }] } },
      });
    };

    it('validates a pre-approved QR via /guard/pre-approved/validate, not /guard/scan', async () => {
      mockValidate(validMatch);
      const utils = renderScreen();
      await scan(utils, PRE_APPROVED_QR);

      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/validate', { qrToken: PRE_APPROVED_QR });
      expect(api.get).toHaveBeenCalledWith('/api/v1/guard/pre-approved?limit=100');
      expect(postedUrls()).not.toContain('/api/v1/guard/scan');
      expect(postedUrls()).not.toContain('/api/v1/guard/verify-code');

      expect(utils.getByText('Valid pass')).toBeTruthy();
      expect(utils.getByText('Swiggy delivery')).toBeTruthy();
      expect(utils.getByText('Raju')).toBeTruthy();
      expect(utils.getByText('Daily · 09:00 – 18:00')).toBeTruthy();
      expect(utils.getByText('Allow entry')).toBeTruthy();
      // Nothing is recorded until the guard taps Allow entry.
      expect(postedUrls()).not.toContain('/api/v1/guard/pre-approved/pa-1/use');
    });

    it('shows denial reasons for an invalid pre-approved QR', async () => {
      mockValidate({
        allowed: false, isPrivate: false, message: 'Pass is not valid right now',
        reasons: [{ entryId: 'pa-1', reason: 'TOO_EARLY' }],
      });
      const utils = renderScreen();
      await scan(utils, PRE_APPROVED_QR);
      expect(utils.getByText('No valid pass')).toBeTruthy();
      expect(utils.getByText('Pass is not valid right now')).toBeTruthy();
      expect(utils.getByText('Too early')).toBeTruthy();
      expect(utils.queryByText('Allow entry')).toBeNull();
    });

    it('records the entry when Allow entry is tapped', async () => {
      mockValidate(validMatch);
      const utils = renderScreen();
      await scan(utils, PRE_APPROVED_QR);

      (api.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });

      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/pre-approved/pa-1/use', {});
      expect(utils.getByText('Entry allowed')).toBeTruthy();
      expect(utils.queryByText('Allow entry')).toBeNull();
    });

    it('records only one entry when Allow entry is double-tapped', async () => {
      mockValidate(validMatch);
      const utils = renderScreen();
      await scan(utils, PRE_APPROVED_QR);

      const use = deferred<unknown>();
      (api.post as jest.Mock).mockImplementation(() => use.promise);
      const allow = utils.getByText('Allow entry');
      // Both taps land before React re-renders the disabled button.
      act(() => { fireEvent.press(allow); fireEvent.press(allow); });
      expect(api.post).toHaveBeenCalledTimes(2); // validate + one /use

      await act(async () => { use.resolve({ data: { success: true } }); });
      expect(postedUrls().filter((u) => u.endsWith('/use'))).toEqual(['/api/v1/guard/pre-approved/pa-1/use']);
      expect(utils.getByText('Entry allowed')).toBeTruthy();
    });

    it('shows "Pass already used" when another guard used it first (409)', async () => {
      mockValidate(validMatch);
      const utils = renderScreen();
      await scan(utils, PRE_APPROVED_QR);

      (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 409, data: { message: 'Already used at 10:02' } } });
      await act(async () => { fireEvent.press(utils.getByText('Allow entry')); });
      expect(utils.getByText('Pass already used')).toBeTruthy();
      expect(utils.getByText('Already used at 10:02')).toBeTruthy();
    });

    it('treats a /guard/scan PRE_APPROVED result as a pre-approved pass', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { type: 'PRE_APPROVED', allowed: true, pass: { entryId: 'pa-9', displayLabel: 'Uber pickup', type: 'CAB', isPrivate: true } } },
      });
      const utils = renderScreen();
      await scan(utils, 'opaque.server.token');
      expect(api.post).toHaveBeenCalledWith('/api/v1/guard/scan', { qrToken: 'opaque.server.token' });
      expect(utils.getByText('Valid pass')).toBeTruthy();
      expect(utils.getByText('Uber pickup')).toBeTruthy();
      expect(utils.getByText('Hidden (private pickup)')).toBeTruthy();
      expect(utils.getByText('Allow entry')).toBeTruthy();
    });
  });
});
