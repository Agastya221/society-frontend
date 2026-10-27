import { AppAlert } from '@/components/gate/AppAlert';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import EmergenciesScreen from '../../app/emergencies';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
}));

const renderScreen = () => render(<EmergenciesScreen />);

const emergencyPosts = () => (api.post as jest.Mock).mock.calls.filter((c) => c[0] === '/api/v1/community/emergencies');

describe('EmergenciesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useLanguageStore.setState({ lang: 'en' });
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { blocks: [{ id: 'b1', name: 'Tower A' }, { id: 'b2', name: 'Tower B' }], commonAreas: ['Main gate', 'Parking'] } } });
  });

  afterEach(() => jest.useRealTimers());

  it('shows every emergency type as a big tile', () => {
    const { getByText } = renderScreen();
    expect(getByText('Emergency SOS')).toBeTruthy();
    for (const label of ['Harassment', 'Medical', 'Fire', 'Security', 'Lift Stuck', 'Animal Threat', 'Theft', 'Violence', 'Accident', 'Other']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('speaks Hindi for guards by default', () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getByText } = renderScreen();
    expect(getByText('आपातकाल')).toBeTruthy();
    expect(getByText('मेडिकल')).toBeTruthy();
    expect(getByText('आग')).toBeTruthy();
  });

  it('asks for one more press before sending anything', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-MEDICAL'));
    expect(getByText('Send the alarm?')).toBeTruthy();
    expect(emergencyPosts()).toHaveLength(0);
  });

  it('cancelling the confirm sends nothing', () => {
    const { getByTestId, queryByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    fireEvent.press(getByTestId('emergency-cancel'));
    expect(queryByText('Send the alarm?')).toBeNull();
    expect(emergencyPosts()).toHaveLength(0);
  });

  it('sends the alarm after the confirm and shows the red success screen', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-MEDICAL'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });

    expect(emergencyPosts()).toHaveLength(1);
    // one location reading is taken when the alarm is sent (the test phone is at 22.8, 86.2)
    expect(emergencyPosts()[0][1]).toEqual({ type: 'MEDICAL', description: 'Medical emergency or injury', latitude: 22.8, longitude: 86.2 });
    expect(getByText('Help is coming')).toBeTruthy();
    expect(getByText('Medical')).toBeTruthy();
  });

  it('has a private harassment alarm whose confirm text says nobody is named', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-HARASSMENT'));
    expect(getByText(/without any names/)).toBeTruthy();
    expect(emergencyPosts()).toHaveLength(0);
  });

  it('says the location is shared once, when sending, not live', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Your location is shared once, when you send')).toBeTruthy();
    expect(queryByText(/LIVE LOCATION/)).toBeNull();
  });

  it('lets the guard pick the tower where it happens, and sends it with the alarm', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-LIFT_STUCK'));
    await act(async () => {});
    expect(api.get).toHaveBeenCalledWith('/api/v1/community/emergencies/places');
    fireEvent.press(getByTestId('place-block-b2'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    expect(emergencyPosts()[0][1]).toMatchObject({ type: 'LIFT_STUCK', blockId: 'b2' });
  });

  it('lets the guard pick a common area, which is sent as the place', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-HARASSMENT'));
    await act(async () => {});
    fireEvent.press(getByTestId('place-area-Parking'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    const body = emergencyPosts()[0][1];
    expect(body).toMatchObject({ type: 'HARASSMENT', location: 'Parking' });
    expect(body.blockId).toBeUndefined();
  });

  it('picking the same place again clears it, and picking nothing still sends the alarm', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    await act(async () => {});
    fireEvent.press(getByTestId('place-block-b1'));
    fireEvent.press(getByTestId('place-block-b1'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    const body = emergencyPosts()[0][1];
    expect(body.type).toBe('FIRE');
    expect(body.blockId).toBeUndefined();
    expect(body.location).toBeUndefined();
  });

  it('still sends the alarm when the list of places cannot be loaded', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    const { getByTestId, getByText, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    await act(async () => {});
    expect(queryByTestId('place-block-b1')).toBeNull();
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    expect(emergencyPosts()).toHaveLength(1);
  });

  it('sends only one alarm on a double tap', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    const send = getByText('Send alarm');
    await act(async () => { fireEvent.press(send); fireEvent.press(send); });
    expect(emergencyPosts()).toHaveLength(1);
  });

  it('goes Home from the success screen', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    fireEvent.press(getByText('Home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('tells the guard to call security when the alarm fails', async () => {
    const alert = jest.spyOn(AppAlert, 'show').mockImplementation(() => {});
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { getByTestId, getByText, queryByText } = renderScreen();
    fireEvent.press(getByTestId('emergency-FIRE'));
    await act(async () => { fireEvent.press(getByText('Send alarm')); });
    expect(alert).toHaveBeenCalledWith('Failed', 'Could not raise the alert. Please call security directly.');
    expect(queryByText('Help is coming')).toBeNull();
    alert.mockRestore();
  });

  it('goes back from the header', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('emergency-back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
