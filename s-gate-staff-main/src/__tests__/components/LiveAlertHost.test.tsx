import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../services/api', () => ({ api: { get: jest.fn() }, API_URL: 'https://x/api/v1' }));
jest.mock('../../services/alertSound', () => ({ startAlertSound: jest.fn(), stopAlertSound: jest.fn(), playSingleChime: jest.fn() }));
let handler: ((alert: any) => Promise<boolean>) | null = null;
jest.mock('../../services/realtime', () => ({
  startRealtime: jest.fn((options: { onAlert: (alert: any) => Promise<boolean> }) => { handler = options.onAlert; }),
  stopRealtime: jest.fn(),
}));

import { startAlertSound, stopAlertSound } from '../../services/alertSound';
import { LiveAlertHost } from '../../components/alerts/LiveAlertHost';
import { useAuth } from '../../store/auth';

const emergency = { title: '🚨 Emergency: FIRE', body: 'A fire emergency was reported near Tower A. Stay safe and follow the instructions of security.', data: { type: 'EMERGENCY_ALERT', emergencyId: 'e1' }, urgent: true };
const allClear = { title: '✅ Emergency resolved', body: 'The emergency has been resolved by Admin.', data: { type: 'EMERGENCY_ALL_CLEAR', emergencyId: 'e1' }, urgent: false };
const workRequest = { title: 'New work request', body: 'Cleaning at A101', data: { type: 'STAFF_BOOKING_NEW', bookingId: 'b1' }, urgent: true };

const send = async (alert: unknown) => { await act(async () => { await handler!(alert); }); };

describe('Staff app LiveAlertHost: emergencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handler = null;
    useAuth.setState({ token: 'staff-token' } as never);
  });

  it('shows an emergency as an emergency and rings', async () => {
    const { getByText, queryByText } = render(<LiveAlertHost />);
    await send(emergency);
    expect(getByText('EMERGENCY')).toBeTruthy();
    expect(getByText('🚨 Emergency: FIRE')).toBeTruthy();
    expect(getByText(/Stay safe/)).toBeTruthy();
    expect(queryByText('NEW WORK REQUEST')).toBeNull();
    expect(queryByText('View request')).toBeNull();
    expect(startAlertSound).toHaveBeenCalledTimes(1);
  });

  it('"OK, I understand" stops the ring and does not open work requests', async () => {
    const { getByText, queryByText } = render(<LiveAlertHost />);
    await send(emergency);
    await act(async () => { fireEvent.press(getByText('OK, I understand')); });
    expect(stopAlertSound).toHaveBeenCalled();
    expect(queryByText('EMERGENCY')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('when the emergency is over, the ringing stops, the screen goes, and a quiet all-clear shows', async () => {
    const { getByText, queryByText } = render(<LiveAlertHost />);
    await send(emergency);
    (stopAlertSound as jest.Mock).mockClear();
    await send(allClear);
    expect(stopAlertSound).toHaveBeenCalled();
    expect(queryByText('EMERGENCY')).toBeNull();
    expect(getByText('✅ Emergency resolved')).toBeTruthy();
  });

  it('tapping the all-clear does not open work requests', async () => {
    const { getByText } = render(<LiveAlertHost />);
    await send(allClear);
    await act(async () => { fireEvent.press(getByText('✅ Emergency resolved')); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a work request still looks and works exactly as before', async () => {
    const { getByText, queryByText } = render(<LiveAlertHost />);
    await send(workRequest);
    expect(getByText('NEW WORK REQUEST')).toBeTruthy();
    expect(queryByText('EMERGENCY')).toBeNull();
    await act(async () => { fireEvent.press(getByText('View request')); });
    expect(mockPush).toHaveBeenCalledWith('/bookings');
  });

  it('a work request all-clear does not close an emergency that is still going', async () => {
    const { getByText } = render(<LiveAlertHost />);
    await send(emergency);
    await send({ title: 'Request cancelled', body: 'x', data: { type: 'STAFF_BOOKING_CANCELLED', bookingId: 'b9' }, urgent: false });
    expect(getByText('EMERGENCY')).toBeTruthy();
  });
});
