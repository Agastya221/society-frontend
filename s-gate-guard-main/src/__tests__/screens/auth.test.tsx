import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

import AuthScreen from '../../app/auth';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (cb: () => void) => { cb(); },
  useLocalSearchParams: () => ({}),
}));

const VALID_PHONE = '9123456789';
const VALID_OTP = '654321';
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.guardtoken';

const mockGuard = {
  id: 'g-001',
  name: 'Ravi Kumar',
  phone: VALID_PHONE,
  role: 'GUARD',
  gate: 'Main Gate',
  shift: 'MORNING',
};

describe('Guard AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: null, refreshToken: null,
      isAuthenticated: false, user: null, isLoading: false,
    });
  });

  // ── Phone screen ───────────────────────────────────────────────────────────
  describe('Phone screen', () => {
    it('renders Guard Portal heading', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText('Guard Portal')).toBeTruthy();
    });

    it('renders S-Gate Security System subtitle', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText('S-Gate Security System')).toBeTruthy();
    });

    it('renders Guard Login card title', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText('Guard Login')).toBeTruthy();
    });

    it('renders Guard Access Only footer badge', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText(/Guard Access Only/i)).toBeTruthy();
    });

    it('renders mobile number input', () => {
      const { getByPlaceholderText } = render(<AuthScreen />);
      expect(getByPlaceholderText('10-digit mobile number')).toBeTruthy();
    });

    it('renders Send OTP button', () => {
      const { getByText } = render(<AuthScreen />);
      expect(getByText('Send OTP')).toBeTruthy();
    });

    it('strips non-numeric characters from phone input', () => {
      const { getByPlaceholderText } = render(<AuthScreen />);
      const input = getByPlaceholderText('10-digit mobile number');
      fireEvent.changeText(input, '91-234-567-89');
      expect(input.props.value).toBe('9123456789');
    });

    it('caps phone input at 10 digits', () => {
      const { getByPlaceholderText } = render(<AuthScreen />);
      const input = getByPlaceholderText('10-digit mobile number');
      fireEvent.changeText(input, '98765432101234');
      expect(input.props.value.length).toBeLessThanOrEqual(10);
    });

    it('shows validation error for short phone number', async () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), '12345');
      await act(async () => { fireEvent.press(getByText('Send OTP')); });
      await waitFor(() => {
        expect(getByText('Please enter a valid 10-digit mobile number')).toBeTruthy();
      });
    });

    it('shows error for phone starting with digit < 6', async () => {
      const { getByText, getByPlaceholderText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), '5123456789');
      await act(async () => { fireEvent.press(getByText('Send OTP')); });
      await waitFor(() => {
        expect(getByText('Please enter a valid 10-digit mobile number')).toBeTruthy();
      });
    });

    it('transitions to OTP screen after successful sendOTP', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', reqId: 'req-xyz789',
      });

      const { getByPlaceholderText, getByText, queryByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => {
        expect(queryByText('Enter OTP')).toBeTruthy();
      });
    });

    it('shows error when sendOTP fails', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({ type: 'error' });

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => {
        expect(getByText('Failed to send OTP. Please try again.')).toBeTruthy();
      });
    });

    it('shows error on network failure during sendOTP', async () => {
      (OTPWidget.sendOTP as jest.Mock).mockRejectedValueOnce(new Error('offline'));

      const { getByPlaceholderText, getByText } = render(<AuthScreen />);
      fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), VALID_PHONE);
      await act(async () => { fireEvent.press(getByText('Send OTP')); });

      await waitFor(() => {
        expect(getByText('Failed to send OTP. Please check your connection.')).toBeTruthy();
      });
    });
  });

  // ── OTP screen ─────────────────────────────────────────────────────────────
  describe('OTP screen', () => {
    const goToOtpScreen = async () => {
      (OTPWidget.sendOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', reqId: 'req-xyz789',
      });
      const utils = render(<AuthScreen />);
      fireEvent.changeText(utils.getByPlaceholderText('10-digit mobile number'), VALID_PHONE);
      await act(async () => { fireEvent.press(utils.getByText('Send OTP')); });
      await waitFor(() => expect(utils.queryByText('Enter OTP')).toBeTruthy());
      return utils;
    };

    it('renders Enter OTP title', async () => {
      const { getByText } = await goToOtpScreen();
      expect(getByText('Enter OTP')).toBeTruthy();
    });

    it('shows masked phone number on OTP screen', async () => {
      const { getByText } = await goToOtpScreen();
      expect(getByText(VALID_PHONE)).toBeTruthy();
    });

    it('renders Change number back link', async () => {
      const { getByText } = await goToOtpScreen();
      expect(getByText('Change number')).toBeTruthy();
    });

    it('returns to phone screen when Change number is pressed', async () => {
      const { getByText, queryByText } = await goToOtpScreen();
      await act(async () => { fireEvent.press(getByText('Change number')); });
      await waitFor(() => expect(queryByText('Guard Login')).toBeTruthy());
    });

    it('renders 6-Digit OTP input', async () => {
      const { getByPlaceholderText } = await goToOtpScreen();
      expect(getByPlaceholderText('• • • • • •')).toBeTruthy();
    });

    it('renders Verify & Sign In button', async () => {
      const { getByText } = await goToOtpScreen();
      expect(getByText('Verify & Sign In')).toBeTruthy();
    });

    it('Verify button is disabled with empty OTP', async () => {
      const { getByText } = await goToOtpScreen();
      // Button only enables when OTP is exactly 6 digits — pressing it does nothing here
      fireEvent.press(getByText('Verify & Sign In'));
      expect(OTPWidget.verifyOTP).not.toHaveBeenCalled();
    });

    it('shows invalid OTP error when verifyOTP fails', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({ type: 'failure' });
      const { getByText, getByPlaceholderText } = await goToOtpScreen();
      fireEvent.changeText(getByPlaceholderText('• • • • • •'), VALID_OTP);
      await act(async () => { fireEvent.press(getByText('Verify & Sign In')); });
      await waitFor(() => {
        expect(getByText('Invalid OTP. Please check and try again.')).toBeTruthy();
      });
    });

    it('shows access denied error for non-guard role', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', message: MOCK_JWT,
      });
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'tok', refreshToken: 'ref',
            user: { ...mockGuard, role: 'RESIDENT' },
          },
        },
      });

      const { getByText, getByPlaceholderText } = await goToOtpScreen();
      fireEvent.changeText(getByPlaceholderText('• • • • • •'), VALID_OTP);
      await act(async () => { fireEvent.press(getByText('Verify & Sign In')); });
      await waitFor(() => {
        expect(getByText('Access denied. This app is for guards only.')).toBeTruthy();
      });
    });

    it('successfully logs in guard and updates store', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', message: MOCK_JWT,
      });
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'access-g', refreshToken: 'refresh-g',
            user: mockGuard,
          },
        },
      });
      const mockSetItemAsync = require('expo-secure-store').setItemAsync;
      mockSetItemAsync.mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = await goToOtpScreen();
      fireEvent.changeText(getByPlaceholderText('• • • • • •'), VALID_OTP);
      await act(async () => { fireEvent.press(getByText('Verify & Sign In')); });

      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(useAuthStore.getState().user?.role).toBe('GUARD');
      });
    });

    it('shows backend error message on failed login', async () => {
      (OTPWidget.verifyOTP as jest.Mock).mockResolvedValueOnce({
        type: 'success', message: MOCK_JWT,
      });
      (api.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { message: 'No guard account found' } },
      });

      const { getByText, getByPlaceholderText } = await goToOtpScreen();
      fireEvent.changeText(getByPlaceholderText('• • • • • •'), VALID_OTP);
      await act(async () => { fireEvent.press(getByText('Verify & Sign In')); });

      await waitFor(() => {
        expect(getByText('No guard account found')).toBeTruthy();
      });
    });
  });
});
