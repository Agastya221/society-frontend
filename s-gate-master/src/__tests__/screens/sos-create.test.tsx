import React from 'react';
import { Vibration } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 22.8, longitude: 86.2 } })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  Accuracy: { High: 4, Balanced: 3 },
}));
jest.mock('@/components/ui/SOSButton', () => ({ SOSButton: () => null }));
jest.mock('@/services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

import api from '@/services/api';
import SharedSOSCreateScreen from '@/components/emergency/SharedSOSCreateScreen';

const PLACES = { blocks: [{ id: 'b1', name: 'Tower A' }, { id: 'b2', name: 'Tower B' }], commonAreas: ['Main gate', 'Parking'] };
const posts = () => (api.post as jest.Mock).mock.calls.filter((c) => c[0] === '/community/emergencies');
const flush = async () => { await act(async () => {}); };

describe('SharedSOSCreateScreen: raising an emergency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { data: PLACES } });
    (api.post as jest.Mock).mockResolvedValue({ data: { data: { id: 'e1', type: 'FIRE' } } });
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  });

  it('does not read the location until an alarm is sent (nothing is tracked)', async () => {
    render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('says the location is shared once, not live', async () => {
    const { getByText, queryByText } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    expect(getByText('Your location is shared once, when you send')).toBeTruthy();
    expect(queryByText(/Live location/i)).toBeNull();
  });

  it('a regular tile sends at once, with one location reading', async () => {
    const { getByLabelText } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Fire emergency category')); });
    expect(posts()).toHaveLength(1);
    expect(posts()[0][1]).toMatchObject({ type: 'FIRE', latitude: 22.8, longitude: 86.2 });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('still sends the alarm when the phone cannot give a location', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
    const { getByLabelText } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Fire emergency category')); });
    expect(posts()).toHaveLength(1);
    expect(posts()[0][1].latitude).toBeUndefined();
  });

  it('the harassment tile asks where first and sends nothing yet', async () => {
    const { getByLabelText, getByText } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Harassment emergency category')); });
    expect(getByText('Harassment alarm')).toBeTruthy();
    expect(getByText(/without any names/)).toBeTruthy();
    expect(posts()).toHaveLength(0);
    expect(api.get).toHaveBeenCalledWith('/community/emergencies/places');
  });

  it('sends the harassment alarm silently with the tower and the location', async () => {
    const { getByLabelText, getByTestId } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Harassment emergency category')); });
    await flush();
    fireEvent.press(getByTestId('place-block-b2'));
    await act(async () => { fireEvent.press(getByTestId('harassment-send')); });
    expect(posts()).toHaveLength(1);
    expect(posts()[0][1]).toMatchObject({ type: 'HARASSMENT', blockId: 'b2', latitude: 22.8, longitude: 86.2 });
    // silent: nothing buzzes or vibrates on her phone
    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('a common area is sent as the place', async () => {
    const { getByLabelText, getByTestId } = render(<SharedSOSCreateScreen role="admin" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Harassment emergency category')); });
    await flush();
    fireEvent.press(getByTestId('place-area-Parking'));
    await act(async () => { fireEvent.press(getByTestId('harassment-send')); });
    expect(posts()[0][1]).toMatchObject({ type: 'HARASSMENT', location: 'Parking' });
    expect(posts()[0][1].blockId).toBeUndefined();
  });

  it('sends the harassment alarm even when no place is picked, and when the places cannot be loaded', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    const { getByLabelText, getByTestId, queryByTestId } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Harassment emergency category')); });
    await flush();
    expect(queryByTestId('place-block-b1')).toBeNull();
    await act(async () => { fireEvent.press(getByTestId('harassment-send')); });
    expect(posts()).toHaveLength(1);
    expect(posts()[0][1].type).toBe('HARASSMENT');
  });

  it('cancelling the harassment sheet sends nothing', async () => {
    const { getByLabelText, getByTestId } = render(<SharedSOSCreateScreen role="resident" />);
    await flush();
    await act(async () => { fireEvent.press(getByLabelText('Harassment emergency category')); });
    await act(async () => { fireEvent.press(getByTestId('harassment-cancel')); });
    expect(posts()).toHaveLength(0);
  });
});
