import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import * as SecureStore from 'expo-secure-store';

import Login from '../../app/login';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => { cb(); },
  useLocalSearchParams: () => ({}),
}));

// Valid 10-digit Indian numbers: must start with 6-9
const VALID_PHONE = '9876543210';
// 10-digit number starting with 5 — passes button enable check but fails regex
const INVALID_PHONE_DIGIT = '5876543210';
const VALID_OTP = '123456';
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.mocktoken';

const mockUser = { id: 'u1', name: 'Resident', email: 'r@test.com', phone: VALID_PHONE, role: 'RESIDENT' };

const resetStore = () =>
  useAuthStore.setState({
    accessToken: null, refreshToken: null, isAuthenticated: false,
    user: null, role: null, appType: null, requiresOnboarding: false,
    onboardingStatus: null, isLoading: false,
  });

describe('Login screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ── Phone screen ────────────────────────────────────────────────────────────
  describe('Phone screen', () => {
    it('renders S-GATE branding', () => {
      const { getByText } = render(<Login />);
      expect(getByText('S-GATE')).toBeTruthy();
    });

    it('renders Welcome Home headline', () => {
      const { getByText } = render(<Login />);
      expect(getByText('Welcome\nHome')).toBeTruthy();
    });

    it('renders phone number input with placeholder', () => {
      const { getByPlaceholderText } = render(<Login />);
      expect(getByPlaceholderText('00000 00000')).toBeTruthy();
    });

    it('renders +91 country prefix', () => {
      const { getByText } = render(<Login />);
      expect(getByText('+91')).toBeTruthy();
    });

    it('renders Send OTP button', () => {
      const { getByText } = render(<Login />);
      expect(getByText('Send OTP')).toBeTruthy();
    });

    it('renders Login as Service Provider link', () => {
      const { getByText } = render(<Login />);
      expect(getByText('Login as Service Provider')).toBeTruthy();
    });

    it('strips non-numeric characters from phone input', () => {
      const { getByPlaceholderText } = render(<Login />);
      const input = getByPlaceholderText('00000 00000');
      fireEvent.changeText(input, '98-765-432-10');
      expect(input.props.value).toBe('9876543210');
    });

    it('caps phone input at 10 digits', () => {
      const { getByPlaceholderText } = render(<Login />);
      const input = getByPlaceholderText('00000 00000');
      fireEvent.changeText(input, '98765432101234');
      expect(input.props.value.length).toBeLessThanOrEqual(10);
    });

    it('shows error for 10-digit number starting with invalid digit', async () => {
      // Button is only enabled when phone.length === 10
      // INVALID_PHONE_DIGIT has 10 digits but starts with 5 (invalid per regex)
      const { getByText, getByPlaceholderText } = render(<Login />);
      fireEvent.changeText(getByPlaceholderText('00000 00000'), INVALID_PHONE_DIGIT);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });
      await waitFor(() => {
        expect(getByText('Please enter a valid 10-digit Indian mobile number')).toBeTruthy();
      });
    });

    it('clears error when user starts typing again', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(<Login />);
      fireEvent.changeText(getByPlaceholderText('00000 00000'), INVALID_PHONE_DIGIT);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });
      await waitFor(() => expect(getByText('Please enter a valid 10-digit Indian mobile number')).toBeTruthy());

      // Typing clears the error
      fireEvent.changeText(getByPlaceholderText('00000 00000'), '987654321');
      await waitFor(() => {
        expect(queryByText('Please enter a valid 10-digit Indian mobile number')).toBeNull();
      });
    });

    it('transitions to OTP screen after successful sendOTP', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-123' });

      const { getByPlaceholderText, getByText, queryByText } = render(<Login />);
      fireEvent.changeText(getByPlaceholderText('00000 00000'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => expect(queryByText('6-DIGIT CODE')).toBeTruthy());
    });

    it('shows error when sendOTP returns error type', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'error' });

      const { getByPlaceholderText, getByText } = render(<Login />);
      fireEvent.changeText(getByPlaceholderText('00000 00000'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => {
        expect(getByText('Failed to send OTP. Please try again.')).toBeTruthy();
      });
    });

    it('shows error on network failure during sendOTP', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockRejectedValueOnce(new Error('Network fail'));

      const { getByPlaceholderText, getByText } = render(<Login />);
      fireEvent.changeText(getByPlaceholderText('00000 00000'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => {
        expect(getByText('Failed to send OTP. Please check your connection.')).toBeTruthy();
      });
    });
  });

  // ── OTP screen ──────────────────────────────────────────────────────────────
  describe('OTP screen', () => {
    const setupOtpScreen = async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'success', reqId: 'req-abc' });
      const utils = render(<Login />);
      fireEvent.changeText(utils.getByPlaceholderText('00000 00000'), VALID_PHONE);
      await act(async () => { fireEvent.press(utils.getByText('Send OTP')); });
      await waitFor(() => expect(utils.queryByText('6-DIGIT CODE')).toBeTruthy());
      return utils;
    };

    it('renders Enter OTP heading', async () => {
      const { getByText } = await setupOtpScreen();
      expect(getByText('Enter\nOTP')).toBeTruthy();
    });

    it('shows sent-to phone number', async () => {
      const { getByText } = await setupOtpScreen();
      // Component renders: <Text>Sent to +91 {phone}</Text> — search full string
      expect(getByText(`Sent to +91 ${VALID_PHONE}`)).toBeTruthy();
    });

    it('renders 6-DIGIT CODE label', async () => {
      const { getByText } = await setupOtpScreen();
      expect(getByText('6-DIGIT CODE')).toBeTruthy();
    });

    it('renders Verify & Continue button', async () => {
      const { getByText } = await setupOtpScreen();
      expect(getByText('Verify & Continue')).toBeTruthy();
    });

    it('shows resend countdown after OTP send', async () => {
      const { getByText } = await setupOtpScreen();
      expect(getByText(/Resend OTP in \d+s/)).toBeTruthy();
    });

    it('does not call verifyOTP when OTP is empty and Verify is pressed', async () => {
      const { getByText } = await setupOtpScreen();
      // Button is guarded: no OTP entered means no handler fires
      fireEvent.press(getByText('Verify & Continue'));
      // verifyOTP should NOT have been called (button disabled prevents it in the real handler)
      // But we can verify no API call happened either
      expect(OTPWidget.verifyOTP).not.toHaveBeenCalled();
    });

    it('shows invalid OTP error when verifyOTP returns failure', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'failure', message: 'FAILED' });

      const { getByText, UNSAFE_getAllByType } = await setupOtpScreen();
      const { TextInput } = require('react-native');
      const otpInput = UNSAFE_getAllByType(TextInput).find(
        (el: any) => el.props.maxLength === 6,
      );
      if (otpInput) fireEvent.changeText(otpInput, VALID_OTP);

      await act(async () => { fireEvent.press(getByText('Verify & Continue')); });
      await waitFor(() => {
        expect(getByText('Invalid OTP. Please check and try again.')).toBeTruthy();
      });
    });

    it('shows 429 error on too many attempts', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', message: MOCK_JWT,
      });
      (api.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 429, data: { message: 'Too many requests' } },
      });

      const { getByText, UNSAFE_getAllByType } = await setupOtpScreen();
      const { TextInput } = require('react-native');
      const otpInput = UNSAFE_getAllByType(TextInput).find(
        (el: any) => el.props.maxLength === 6,
      );
      if (otpInput) fireEvent.changeText(otpInput, VALID_OTP);

      await act(async () => { fireEvent.press(getByText('Verify & Continue')); });
      await waitFor(() => {
        expect(getByText('Too many attempts. Please try again later.')).toBeTruthy();
      });
    });

    it('successfully logs in: calls login store on valid OTP + backend success', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', message: MOCK_JWT,
      });
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'access-xyz',
            refreshToken: 'refresh-xyz',
            user: mockUser,
            appType: 'RESIDENT',
            requiresOnboarding: false,
            onboardingStatus: null,
          },
        },
      });
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { getByText, UNSAFE_getAllByType } = await setupOtpScreen();
      const { TextInput } = require('react-native');
      const otpInput = UNSAFE_getAllByType(TextInput).find(
        (el: any) => el.props.maxLength === 6,
      );
      if (otpInput) fireEvent.changeText(otpInput, VALID_OTP);

      await act(async () => { fireEvent.press(getByText('Verify & Continue')); });
      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(useAuthStore.getState().user?.role).toBe('RESIDENT');
      });
    });
  });

  // ── Feature pills ───────────────────────────────────────────────────────────
  describe('Feature pills', () => {
    it('renders SECURE pill', () => {
      const { getByText } = render(<Login />);
      expect(getByText('SECURE')).toBeTruthy();
    });

    it('renders RESIDENT pill', () => {
      const { getByText } = render(<Login />);
      expect(getByText('RESIDENT')).toBeTruthy();
    });

    it('renders ASSIST pill', () => {
      const { getByText } = render(<Login />);
      expect(getByText('ASSIST')).toBeTruthy();
    });

    it('renders powered-by footer', () => {
      const { getByText } = render(<Login />);
      expect(getByText(/POWERED BY S-GATE TECHNOLOGY/i)).toBeTruthy();
    });
  });
});
