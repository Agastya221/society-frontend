import { AppAlert } from '@/components/gate/AppAlert';
import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import TodayEntriesScreen from '../../app/today-entries';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

const TODAY = {
  entries: [
    { id: 'late', visitorName: 'Zomato Rider', type: 'DELIVERY', companyName: 'Zomato', flat: { flatNumber: 'A101' }, status: 'CHECKED_IN', checkInTime: minutesAgo(20), checkOutTime: null },
    { id: 'fresh', visitorName: 'Swiggy Rider', type: 'DELIVERY', companyName: 'Swiggy', flat: { flatNumber: 'B202' }, status: 'CHECKED_IN', checkInTime: minutesAgo(5), checkOutTime: null },
    { id: 'guest', visitorName: 'Asha Rao', type: 'VISITOR', flat: { flatNumber: 'C303' }, status: 'CHECKED_IN', checkInTime: minutesAgo(90), checkOutTime: null },
  ],
  staffAttendances: [],
};

const renderScreen = async () => {
  const utils = render(<TodayEntriesScreen />);
  await act(async () => {});
  return utils;
};

describe('TodayEntriesScreen: a delivery that has been inside a while', () => {
  let alertSpy: jest.SpyInstance;
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: TODAY } });
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    alertSpy = jest.spyOn(AppAlert, 'show').mockImplementation(() => {});
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => { alertSpy.mockRestore(); openSpy.mockRestore(); });

  it('warns on a delivery inside 15 minutes or more, and only on that one', async () => {
    const { getByTestId, queryByTestId, getByText } = await renderScreen();
    expect(getByTestId('overstay-late')).toBeTruthy();
    expect(getByText('Inside for 20 min. Check with the flat.')).toBeTruthy();
    expect(queryByTestId('overstay-fresh')).toBeNull();
    expect(queryByTestId('overstay-guest')).toBeNull();
  });

  it('"Poke the flat" tells the server, then confirms to the guard', async () => {
    const { getByTestId } = await renderScreen();
    await act(async () => { fireEvent.press(getByTestId('poke-late')); });
    expect(api.post).toHaveBeenCalledWith('/api/v1/guard/entries/late/nudge', {});
    expect(alertSpy).toHaveBeenCalledWith('Flat poked', 'The residents have been notified.');
  });

  it('shows the server message when poking is refused', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'The flat was poked a moment ago. Please wait two minutes.' } } });
    const { getByTestId } = await renderScreen();
    await act(async () => { fireEvent.press(getByTestId('poke-late')); });
    expect(alertSpy).toHaveBeenCalledWith('Could not poke the flat', 'The flat was poked a moment ago. Please wait two minutes.');
  });

  it('"Call the flat" opens the phone dialler with the resident\'s number', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/contact') ? { data: { data: { contact: { name: 'Ravi', phone: '9000000401' } } } } : { data: { data: TODAY } }));
    const { getByTestId } = await renderScreen();
    await act(async () => { fireEvent.press(getByTestId('call-late')); });
    expect(api.get).toHaveBeenCalledWith('/api/v1/guard/entries/late/contact');
    expect(openSpy).toHaveBeenCalledWith('tel:9000000401');
  });

  it('says so when there is no number to call', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/contact') ? { data: { data: { contact: null } } } : { data: { data: TODAY } }));
    const { getByTestId } = await renderScreen();
    await act(async () => { fireEvent.press(getByTestId('call-late')); });
    expect(openSpy).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Could not call', 'No phone number found for this flat.');
  });
});
