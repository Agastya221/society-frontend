import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => { require('react').useEffect(() => { cb(); }, []); },
}));
jest.mock('@/components/ui/FloatingSOSButton', () => ({ FloatingSOSButton: () => null }));
jest.mock('@/services/api', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }));

import api from '@/services/api';
import AdminEmergenciesScreen from '@/app/(admin)/emergencies';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const ROWS = [
  { id: 'new', type: 'HARASSMENT', status: 'ACTIVE', description: 'Followed near the gate', location: 'Parking', block: { name: 'Tower B' }, latitude: 22.8046, longitude: 86.2029, createdAt: minutesAgo(3), reportedBy: { name: 'Priya' }, flat: { flatNumber: 'B204' } },
  { id: 'old', type: 'FIRE', status: 'ACTIVE', description: 'Smoke', location: '22.8,86.2', createdAt: minutesAgo(9), reportedBy: { name: 'Ravi' } },
  { id: 'none', type: 'OTHER', status: 'ACTIVE', description: 'Power cut', createdAt: minutesAgo(15), reportedBy: { name: 'Sam' } },
];

describe('Admin emergencies: where the person is', () => {
  let openSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { emergencies: ROWS } } });
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });
  afterEach(() => openSpy.mockRestore());

  const mount = async () => { const utils = render(<AdminEmergenciesScreen />); await act(async () => {}); return utils; };

  it('shows the harassment alarm with the tower and place, and opens the exact pin in maps', async () => {
    const { getByText, getByTestId } = await mount();
    expect(getByText('Harassment')).toBeTruthy();
    expect(getByText('Tower B · Parking')).toBeTruthy();
    await act(async () => { fireEvent.press(getByTestId('map-new')); });
    expect(openSpy).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=22.8046,86.2029');
  });

  it('turns the "lat,lng" text of older alarms into a map button instead of showing the numbers', async () => {
    const { getByTestId, queryByText } = await mount();
    expect(queryByText('22.8,86.2')).toBeNull();
    await act(async () => { fireEvent.press(getByTestId('map-old')); });
    expect(openSpy).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=22.8,86.2');
  });

  it('shows no map button when there is no location', async () => {
    const { queryByTestId } = await mount();
    expect(queryByTestId('map-none')).toBeNull();
  });
});
