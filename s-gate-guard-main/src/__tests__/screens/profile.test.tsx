import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useLanguageStore } from '@/i18n';

import ProfileScreen from '../../app/profile';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

const PROFILE = {
  id: 'g-001-abcdef',
  name: 'Manoj Kumar',
  phone: '6202923168',
  role: 'GUARD',
  isActive: true,
  lastLogin: '2026-10-13T10:00:00.000Z',
  society: { name: 'Dalma Heights Residency', address: 'Main road', city: 'Jamshedpur' },
};

const renderScreen = async () => {
  const utils = render(<ProfileScreen />);
  await act(async () => {});
  return utils;
};

describe('ProfileScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    useAuthStore.setState({
      accessToken: 't', refreshToken: 'r', isAuthenticated: true, user: { id: 'g-001', role: 'GUARD' } as any, isLoading: false,
    });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: PROFILE } });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('shows the guard, duty status, phone and society', async () => {
    const { getByText } = await renderScreen();
    expect(api.get).toHaveBeenCalledWith('/api/v1/auth/guard-app/profile');
    expect(getByText('Manoj Kumar')).toBeTruthy();
    expect(getByText('ON DUTY')).toBeTruthy();
    expect(getByText('6202923168')).toBeTruthy();
    expect(getByText('Dalma Heights Residency, Jamshedpur')).toBeTruthy();
  });

  it('shows INACTIVE for an inactive guard', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { ...PROFILE, isActive: false } } });
    const { getByText } = await renderScreen();
    expect(getByText('INACTIVE')).toBeTruthy();
  });

  it('switches the language and the whole screen follows', async () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getByText } = await renderScreen();
    expect(getByText('ड्यूटी पर')).toBeTruthy();
    fireEvent.press(getByText('English'));
    expect(useLanguageStore.getState().lang).toBe('en');
    expect(getByText('ON DUTY')).toBeTruthy();
  });

  it('asks before logging out, then logs out', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout } as any);
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('Log out'));
    expect(alertSpy).toHaveBeenCalledWith('Log out?', expect.any(String), expect.any(Array));
    expect(logout).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    await act(async () => { await buttons.find((b) => b.text === 'Log out')!.onPress?.(); });
    expect(logout).toHaveBeenCalled();
  });

  it('offers a retry (and still language and log out) when the profile fails to load', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { getByText } = await renderScreen();
    expect(getByText('Could not load profile')).toBeTruthy();
    expect(getByText('Log out')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();

    await act(async () => { fireEvent.press(getByText('Try again')); });
    expect(getByText('Manoj Kumar')).toBeTruthy();
  });

  it('has a Home button', async () => {
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('Home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
