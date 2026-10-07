import React from 'react';
import { Platform } from 'react-native';
import { render, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

import RootLayout from '../../app/_layout';

// A tiny stand-in for the expo-router Stack that keeps the Stack.Protected
// semantics: screens under a falsy guard are not registered at all.
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const R = require('react');
  const { Text, View } = require('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => R.createElement(View, { testID: 'stack' }, children);
  Stack.Screen = ({ name }: { name: string }) => R.createElement(Text, { testID: `screen-${name}` }, name);
  Stack.Protected = ({ guard, children }: { guard: boolean; children: React.ReactNode }) =>
    (guard ? R.createElement(R.Fragment, null, children) : null);
  return {
    Stack,
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  };
});

jest.mock('../../global.css', () => ({}), { virtual: true });

const PROTECTED_SCREENS = [
  'index', 'new-entry', 'today-entries', 'approvals', 'staff-scan',
  'pre-approved', 'scan-verify', 'entry-waiting', 'emergencies', 'profile',
];

const guardUser = { id: 'g-1', name: 'Ravi', role: 'GUARD', gate: 'Main Gate', shift: 'MORNING' };

const setAuth = (patch: Partial<ReturnType<typeof useAuthStore.getState>>) =>
  useAuthStore.setState({
    accessToken: null, refreshToken: null, user: null,
    isAuthenticated: false, isLoading: false,
    loadToken: jest.fn().mockResolvedValue(undefined),
    ...patch,
  });

const renderLayout = async () => {
  const utils = render(<RootLayout />);
  await act(async () => {});
  return utils;
};

describe('RootLayout (auth routing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Notifications as any).getDevicePushTokenAsync = jest.fn().mockResolvedValue({ data: 'fcm-device-token' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (api.patch as jest.Mock).mockResolvedValue({});
  });

  it('loads the stored session on mount', async () => {
    const loadToken = jest.fn().mockResolvedValue(undefined);
    setAuth({ loadToken });
    await renderLayout();
    expect(loadToken).toHaveBeenCalledTimes(1);
  });

  it('shows only a loader (no navigator) while the session is loading', async () => {
    setAuth({ isLoading: true });
    const { queryByTestId } = await renderLayout();
    expect(queryByTestId('stack')).toBeNull();
    expect(queryByTestId('screen-auth')).toBeNull();
    expect(queryByTestId('screen-index')).toBeNull();
  });

  it('registers only the auth screen when signed out', async () => {
    setAuth({ isAuthenticated: false });
    const { getByTestId, queryByTestId } = await renderLayout();
    expect(getByTestId('screen-auth')).toBeTruthy();
    for (const name of PROTECTED_SCREENS) {
      expect(queryByTestId(`screen-${name}`)).toBeNull();
    }
  });

  it('registers the guard screens and hides auth when signed in', async () => {
    setAuth({ isAuthenticated: true, accessToken: 'tok', user: guardUser as any });
    const { getByTestId, queryByTestId } = await renderLayout();
    expect(queryByTestId('screen-auth')).toBeNull();
    for (const name of PROTECTED_SCREENS) {
      expect(getByTestId(`screen-${name}`)).toBeTruthy();
    }
  });

  it('does not register a push token while signed out', async () => {
    setAuth({ isAuthenticated: false });
    await renderLayout();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('registers the native FCM token after sign-in', async () => {
    setAuth({ isAuthenticated: true, accessToken: 'tok', user: guardUser as any });
    await renderLayout();
    expect((Notifications as any).getDevicePushTokenAsync).toHaveBeenCalled();
    expect(api.patch).toHaveBeenCalledWith('/users/guard-app/fcm-token', {
      fcmToken: 'fcm-device-token',
      deviceType: Platform.OS,
    });
  });

  it('skips FCM registration when notification permission is denied', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    setAuth({ isAuthenticated: true, accessToken: 'tok', user: guardUser as any });
    await renderLayout();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('opens approvals when a gate approval notification is tapped', async () => {
    setAuth({ isAuthenticated: true, accessToken: 'tok', user: guardUser as any });
    await renderLayout();
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
    const tap = (type: string) => listener({ notification: { request: { content: { data: { type } } } } });

    tap('GATE_APPROVED');
    tap('GATE_DENIED');
    tap('SOMETHING_ELSE');
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith('/approvals');
  });
});
