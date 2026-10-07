import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

import AuthScreen from '../../app/auth';

const VALID_PHONE = '9123456789';
const VALID_OTP = '654321';
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.guardtoken';
const NOT_A_GUARD = 'This app is for security guards. Use the S-Gate app.';

const PHONE_PLACEHOLDER = 'Enter registered number';
const OTP_PLACEHOLDER = '••••••';

const mockGuard = {
  id: 'g-001',
  name: 'Ravi Kumar',
  phone: VALID_PHONE,
  role: 'GUARD',
  gate: 'Main Gate',
  shift: 'MORNING',
};

const backendLogin = (user: Record<string, unknown>, tokens = { accessToken: 'access-g', refreshToken: 'refresh-g' }) => ({
  data: { data: { ...tokens, user } },
});

describe('Guard AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    useAuthStore.setState({
      accessToken: null, refreshToken: null,
      isAuthenticated: false, user: null, isLoading: false,
    });
  });

  // ── Phone step ─────────────────────────────────────────────────────────────
  describe('Phone step', () => {
    it('renders the guard sign-in copy', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText('Welcome, guard.')).toBeTruthy();
      expect(getByText('TRUSTED SOCIETY ACCESS')).toBeTruthy();
      expect(getByText('SECURE STAFF SIGN IN')).toBeTruthy();
      expect(getByText('MOBILE NUMBER')).toBeTruthy();
      expect(getByText('+91')).toBeTruthy();
    });

    it('initialises the MSG91 widget on mount', () => {
      render(<AuthScreen />);
      expect(OTPWidget.initializeWidget).toHaveBeenCalledTimes(1);
    });

    it('renders the mobile number input and Continue button', () => {
      const { getByPlaceholderText, getByText } = render(<AuthScreen />);
      expect(getByPlaceholderText(PHONE_PLACEHOLDER)).toBeTruthy();
      expect(getByText('Continue securely')).toBeTruthy();
    });

    it('strips non-numeric characters from phone input', () => {
      const { getByPlaceholderText } = render(<AuthScreen />);
      const input = getByPlaceholderText(PHONE_PLACEHOLDER);
      fireEvent.changeText(input, '91-234-567-89');
      expect(getByPlaceholderText(PHONE_PLACEHOLDER).props.value).toBe('9123456789');
    });

    it('caps phone input at 10 digits', () => {
      const { getByPlaceholderText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), '98765432101234');
      expect(getByPlaceholderText(PHONE_PLACEHOLDER).props.value).toBe('9876543210');
    });

    it('does not send an OTP while the number is shorter than 10 digits', async () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), '12345');
      await act(async () => { fireEvent.press(getByText('Continue securely')); });
      expect(OTPWidget.sendOTP).not.toHaveBeenCalled();
    });

    it('rejects a 10-digit number that does not start with 6-9', async () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), '5123456789');
      await act(async () => { fireEvent.press(getByText('Continue securely')); });
      expect(getByText('Enter a valid 10-digit mobile number.')).toBeTruthy();
      expect(OTPWidget.sendOTP).not.toHaveBeenCalled();
    });

    it('sends the OTP with the 91 prefix and moves to the OTP step', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-xyz789' });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Continue securely')); });

      expect(OTPWidget.sendOTP).toHaveBeenCalledWith({ identifier: `91${VALID_PHONE}` });
      await waitFor(() => expect(getByText('Verify your number.')).toBeTruthy());
    });

    it('shows an error when sendOTP returns an error', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'error' });

      const { getByPlaceholderText, getByText, queryByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Continue securely')); });

      expect(getByText('Could not send the OTP. Please try again.')).toBeTruthy();
      expect(queryByText('Verify your number.')).toBeNull();
    });

    it('shows a connection error when sendOTP throws', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockRejectedValueOnce(new Error('offline'));

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Continue securely')); });

      expect(getByText('Could not send the OTP. Check your connection.')).toBeTruthy();
    });

    it('clears the error when the number is edited', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), '5123456789');
      await act(async () => { fireEvent.press(getByText('Continue securely')); });
      expect(getByText('Enter a valid 10-digit mobile number.')).toBeTruthy();

      fireEvent.changeText(getByPlaceholderText(PHONE_PLACEHOLDER), '912345678');
      expect(queryByText('Enter a valid 10-digit mobile number.')).toBeNull();
    });
  });

  // ── OTP step ───────────────────────────────────────────────────────────────
  describe('OTP step', () => {
    const goToOtpStep = async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-xyz789' });
      const utils = render(<AuthScreen />);
      fireEvent.changeText(utils.getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(utils.getByText('Continue securely')); });
      await waitFor(() => expect(utils.getByText('Verify your number.')).toBeTruthy());
      return utils;
    };

    const submitOtp = async (utils: Awaited<ReturnType<typeof goToOtpStep>>, otp = VALID_OTP) => {
      fireEvent.changeText(utils.getByPlaceholderText(OTP_PLACEHOLDER), otp);
      await act(async () => { fireEvent.press(utils.getByText('Verify & sign in')); });
    };

    it('shows the number the code was sent to', async () => {
      const { getByText } = await goToOtpStep();
      expect(getByText(`We sent a security code to +91 ${VALID_PHONE}.`)).toBeTruthy();
      expect(getByText('6-DIGIT OTP')).toBeTruthy();
    });

    it('renders the OTP input, verify button and resend countdown', async () => {
      const { getByPlaceholderText, getByText } = await goToOtpStep();
      expect(getByPlaceholderText(OTP_PLACEHOLDER)).toBeTruthy();
      expect(getByText('Verify & sign in')).toBeTruthy();
      expect(getByText('Resend available in 30s')).toBeTruthy();
    });

    it('returns to the phone step when Change mobile number is pressed', async () => {
      const { getByText, queryByText } = await goToOtpStep();
      await act(async () => { fireEvent.press(getByText('Change mobile number')); });
      expect(getByText('Welcome, guard.')).toBeTruthy();
      expect(queryByText('Verify your number.')).toBeNull();
    });

    it('does not verify while the OTP is incomplete', async () => {
      const utils = await goToOtpStep();
      await submitOtp(utils, '123');
      expect(OTPWidget.verifyOTP).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows an incorrect-OTP error when the widget rejects the code', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'failure' });
      const utils = await goToOtpStep();
      await submitOtp(utils);
      expect(OTPWidget.verifyOTP).toHaveBeenCalledWith({ reqId: 'req-xyz789', otp: VALID_OTP });
      expect(utils.getByText('That OTP is incorrect. Please try again.')).toBeTruthy();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('exchanges the widget token with the guard-app verify endpoint and logs in', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', message: MOCK_JWT });
      (api.post as jest.Mock).mockResolvedValueOnce(backendLogin(mockGuard));

      const utils = await goToOtpStep();
      await submitOtp(utils);

      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/guard-app/otp/verify', { widgetToken: MOCK_JWT });
      await waitFor(() => {
        const s = useAuthStore.getState();
        expect(s.isAuthenticated).toBe(true);
        expect(s.accessToken).toBe('access-g');
        expect(s.user?.role).toBe('GUARD');
      });
    });

    it('falls back to the reqId as widget token when the message is not a JWT', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ message: 'SUCCESS', reqId: 'req-from-verify' });
      (api.post as jest.Mock).mockResolvedValueOnce(backendLogin(mockGuard));

      const utils = await goToOtpStep();
      await submitOtp(utils);

      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/guard-app/otp/verify', { widgetToken: 'req-from-verify' });
    });

    it('shows an error when the backend returns no tokens', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', message: MOCK_JWT });
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: { user: mockGuard } } });

      const utils = await goToOtpStep();
      await submitOtp(utils);

      expect(utils.getByText('Authentication failed. Contact your administrator.')).toBeTruthy();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('shows the backend error message and an alert when no guard account exists', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', message: MOCK_JWT });
      (api.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { message: 'No guard account found' } },
      });

      const utils = await goToOtpStep();
      await submitOtp(utils);

      expect(utils.getByText('No guard account found')).toBeTruthy();
      expect(alertSpy).toHaveBeenCalledWith('Guard account not found', expect.any(String), expect.any(Array));
      alertSpy.mockRestore();
    });
  });

  // ── Guard-only login ───────────────────────────────────────────────────────
  describe('Guard-only login', () => {
    const verifyAs = async (setupBackend: () => void) => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-xyz789' });
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', message: MOCK_JWT });
      setupBackend();
      const utils = render(<AuthScreen />);
      fireEvent.changeText(utils.getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(utils.getByText('Continue securely')); });
      await waitFor(() => expect(utils.getByText('Verify your number.')).toBeTruthy());
      fireEvent.changeText(utils.getByPlaceholderText(OTP_PLACEHOLDER), VALID_OTP);
      await act(async () => { fireEvent.press(utils.getByText('Verify & sign in')); });
      return utils;
    };

    it.each(['SUPER_ADMIN', 'RESIDENT', 'ADMIN'])(
      'rejects a %s account returned by the backend without storing the session',
      async (role) => {
        const utils = await verifyAs(() => {
          (api.post as jest.Mock).mockResolvedValueOnce(backendLogin({ ...mockGuard, role }));
        });

        expect(utils.getByText(NOT_A_GUARD)).toBeTruthy();
        const s = useAuthStore.getState();
        expect(s.isAuthenticated).toBe(false);
        expect(s.accessToken).toBeNull();
        expect(s.user).toBeNull();
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      },
    );

    it('maps the server 403 "guards only" rejection to the guard-only message', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const utils = await verifyAs(() => {
        (api.post as jest.Mock).mockRejectedValueOnce({
          response: { status: 403, data: { message: 'This login is for guards only.' } },
        });
      });

      expect(utils.getByText(NOT_A_GUARD)).toBeTruthy();
      expect(utils.queryByText('This login is for guards only.')).toBeNull();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      alertSpy.mockRestore();
    });

    it('keeps other 403 messages as-is', async () => {
      const utils = await verifyAs(() => {
        (api.post as jest.Mock).mockRejectedValueOnce({
          response: { status: 403, data: { message: 'Account suspended' } },
        });
      });

      expect(utils.getByText('Account suspended')).toBeTruthy();
      expect(utils.queryByText(NOT_A_GUARD)).toBeNull();
    });
  });

  // ── Resend ─────────────────────────────────────────────────────────────────
  describe('Resend OTP', () => {
    afterEach(() => { jest.useRealTimers(); });

    it('enables Resend after the 30s countdown and retries with the reqId', async () => {
      jest.useFakeTimers();
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-xyz789' });
      (OTPWidget.retryOTP as jest.Mock).mockResolvedValueOnce({ reqId: 'req-xyz789' });

      const utils = render(<AuthScreen />);
      fireEvent.changeText(utils.getByPlaceholderText(PHONE_PLACEHOLDER), VALID_PHONE);
      await act(async () => { fireEvent.press(utils.getByText('Continue securely')); });
      expect(utils.getByText('Resend available in 30s')).toBeTruthy();

      // Pressing during the countdown does nothing.
      await act(async () => { fireEvent.press(utils.getByText('Resend available in 30s')); });
      expect(OTPWidget.retryOTP).not.toHaveBeenCalled();

      for (let i = 0; i < 30; i++) {
        act(() => { jest.advanceTimersByTime(1000); });
      }
      expect(utils.getByText('Resend OTP')).toBeTruthy();

      await act(async () => { fireEvent.press(utils.getByText('Resend OTP')); });
      expect(OTPWidget.retryOTP).toHaveBeenCalledWith({ reqId: 'req-xyz789' });
      expect(utils.getByText('Resend available in 30s')).toBeTruthy();
    });
  });
});
