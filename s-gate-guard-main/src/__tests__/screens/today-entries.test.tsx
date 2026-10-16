import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import TodayEntriesScreen from '../../app/today-entries';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

const at = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
// Keep every record on "today" even if the suite runs just after midnight.
const safeAt = (minsAgo: number) => {
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  return at(Math.min(minsAgo, Math.max(0, minutesSinceMidnight - 1)));
};

const TODAY = {
  entries: [
    { id: 'in-1', visitorName: 'Asha Rao', type: 'VISITOR', flat: { flatNumber: 'A101' }, status: 'CHECKED_IN', checkInTime: safeAt(0), checkOutTime: null },
    { id: 'out-1', visitorName: 'Ravi Courier', type: 'DELIVERY', flat: { flatNumber: 'B204' }, status: 'CHECKED_OUT', checkInTime: safeAt(0), checkOutTime: safeAt(0) },
    { id: 'wait-1', visitorName: 'Cab Driver', type: 'CAB', flat: { flatNumber: 'C301' }, status: 'PENDING', checkInTime: safeAt(0), checkOutTime: null },
  ],
  staffAttendances: [
    { id: 'st-1', domesticStaff: { name: 'Savita Bai', staffType: 'MAID' }, flat: { flatNumber: 'A101' }, checkInTime: safeAt(0), checkOutTime: null },
  ],
};

const renderScreen = async () => {
  const utils = render(<TodayEntriesScreen />);
  await act(async () => {});
  return utils;
};

describe('TodayEntriesScreen (who is inside)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockResolvedValue({ data: { data: TODAY } });
    (api.patch as jest.Mock).mockResolvedValue({});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('shows only the people inside right now by default', async () => {
    const { getByText, queryByText } = await renderScreen();
    expect(api.get).toHaveBeenCalledWith('/api/v1/guard/today');
    expect(getByText('Asha Rao')).toBeTruthy();
    expect(getByText('Savita Bai')).toBeTruthy();
    expect(queryByText('Ravi Courier')).toBeNull();
    expect(queryByText('Cab Driver')).toBeNull();
  });

  it('speaks Hindi by default for guards', async () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getByText, getAllByText } = await renderScreen();
    expect(getByText('अभी अंदर')).toBeTruthy();
    expect(getByText('आज के सभी')).toBeTruthy();
    expect(getAllByText('बाहर').length).toBeGreaterThan(0);
  });

  it('gives each visitor inside a big Exit button that records the exit', async () => {
    const { getByTestId, queryByText } = await renderScreen();
    await act(async () => { fireEvent.press(getByTestId('exit-in-1')); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/guard/entries/in-1/checkout');
    expect(queryByText('Asha Rao')).toBeNull();
  });

  it('records only one exit on a double tap', async () => {
    const { getByTestId } = await renderScreen();
    const exit = getByTestId('exit-in-1');
    await act(async () => { fireEvent.press(exit); fireEvent.press(exit); });
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it('shows the server message and refreshes when the exit fails', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Already checked out' } } });
    const { getByTestId } = await renderScreen();
    (api.get as jest.Mock).mockClear();
    await act(async () => { fireEvent.press(getByTestId('exit-in-1')); });
    expect(alertSpy).toHaveBeenCalledWith('Could not record the exit', 'Already checked out');
    expect(api.get).toHaveBeenCalledWith('/api/v1/guard/today');
  });

  it('tells staff to be checked out by scanning instead of offering Exit', async () => {
    const { getByText, queryByTestId } = await renderScreen();
    expect(getByText('Scan the staff QR to check them out')).toBeTruthy();
    expect(queryByTestId('exit-st-1')).toBeNull();
  });

  it('"All today" shows every record and the filters', async () => {
    const { getByTestId, getByText, queryByText } = await renderScreen();
    expect(queryByText('Deliveries')).toBeNull();
    fireEvent.press(getByTestId('view-all'));
    expect(getByText('Ravi Courier')).toBeTruthy();
    expect(getByText('Cab Driver')).toBeTruthy();
    expect(getByText('Deliveries')).toBeTruthy();
    expect(getByText('Waiting')).toBeTruthy();
  });

  it('keeps people still inside from earlier days under Inside now, but not under All today', async () => {
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    (api.get as jest.Mock).mockResolvedValue({ data: { data: {
      entries: [
        ...TODAY.entries,
        { id: 'old-in', visitorName: 'Night Guest', type: 'VISITOR', flat: { flatNumber: 'D402' }, status: 'CHECKED_IN', checkInTime: yesterday, checkOutTime: null },
      ],
      staffAttendances: [
        ...TODAY.staffAttendances,
        { id: 'old-st', domesticStaff: { name: 'Night Nurse', staffType: 'NURSE' }, flat: { flatNumber: 'D402' }, checkInTime: yesterday, checkOutTime: null },
      ],
    } } });
    const { getByTestId, getByText, queryByText } = await renderScreen();
    expect(getByText('Night Guest')).toBeTruthy();
    expect(getByText('Night Nurse')).toBeTruthy();
    fireEvent.press(getByTestId('view-all'));
    expect(queryByText('Night Guest')).toBeNull();
    expect(queryByText('Night Nurse')).toBeNull();
    expect(getByText('Ravi Courier')).toBeTruthy();
  });

  it('filters the full list by kind', async () => {
    const { getByTestId, getByText, queryByText } = await renderScreen();
    fireEvent.press(getByTestId('view-all'));
    fireEvent.press(getByText('Deliveries'));
    expect(getByText('Ravi Courier')).toBeTruthy();
    expect(queryByText('Asha Rao')).toBeNull();
  });

  it('says nobody is inside when the gate is empty', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { entries: [], staffAttendances: [] } } });
    const { getByText, getByTestId } = await renderScreen();
    expect(getByText('Nobody inside')).toBeTruthy();
    fireEvent.press(getByTestId('view-all'));
    expect(getByText('No entries today')).toBeTruthy();
  });

  it('has a Home button', async () => {
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('Home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
