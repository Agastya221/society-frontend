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
  });

  afterEach(() => jest.useRealTimers());

  it('shows every emergency type as a big tile', () => {
    const { getByText } = renderScreen();
    expect(getByText('Emergency')).toBeTruthy();
    for (const label of ['Medical', 'Fire', 'Security threat', 'Violence', 'Theft', 'Accident', 'Lift stuck', 'Animal threat', 'Other']) {
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
    expect(emergencyPosts()[0][1]).toEqual({ type: 'MEDICAL', description: 'Medical emergency or injury' });
    expect(getByText('Help is coming')).toBeTruthy();
    expect(getByText('Medical')).toBeTruthy();
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
