import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/services/realtime', () => ({ startRealtime: jest.fn(), stopRealtime: jest.fn() }));
jest.mock('@/services/notification.service', () => ({ getUnreadCount: jest.fn(() => Promise.resolve(0)) }));
jest.mock('@/services/alertSound', () => ({
  playSingleChime: jest.fn(), startAlertSound: jest.fn(), stopAlertSound: jest.fn(),
}));

import { startRealtime } from '@/services/realtime';
import { LiveAlertHost } from '@/components/alerts/LiveAlertHost';
import { useAuthStore } from '@/store/useAuthStore';
import { useGateStore } from '@/store/useGateStore';

describe('LiveAlertHost and accounts still in onboarding', () => {
  const fetchPending = jest.fn(() => Promise.resolve());
  beforeEach(() => {
    jest.clearAllMocks();
    useGateStore.setState({ fetchPendingRequests: fetchPending as never, pendingRequests: [] });
  });

  it('does nothing for a new, not yet approved account: those calls are refused by the server and sign the person out', () => {
    useAuthStore.setState({ isAuthenticated: true, requiresOnboarding: true, accessToken: 't' } as never);
    render(<LiveAlertHost onOpen={jest.fn()} />);
    expect(startRealtime).not.toHaveBeenCalled();
    expect(fetchPending).not.toHaveBeenCalled();
  });

  it('does nothing when logged out', () => {
    useAuthStore.setState({ isAuthenticated: false, requiresOnboarding: false } as never);
    render(<LiveAlertHost onOpen={jest.fn()} />);
    expect(startRealtime).not.toHaveBeenCalled();
  });

  it('starts live alerts and the waiting-visitor check once the account is set up', () => {
    useAuthStore.setState({ isAuthenticated: true, requiresOnboarding: false, accessToken: 't' } as never);
    render(<LiveAlertHost onOpen={jest.fn()} />);
    expect(startRealtime).toHaveBeenCalledTimes(1);
    expect(fetchPending).toHaveBeenCalled();
  });
});
