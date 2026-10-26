import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import MyAttendanceScreen from '../../app/my-attendance';

const MONTH = {
  month: '2026-10',
  daysPresent: 12,
  totalMinutes: 5400,
  lateCount: 2,
  earlyCount: 1,
  onDutyNow: true,
  scheduledShift: { name: 'Morning', startTime: '06:00', endTime: '14:00' },
  shifts: [
    { id: 's1', date: '2026-10-20', startedAt: '2026-10-20T00:35:00.000Z', endedAt: '2026-10-20T08:30:00.000Z', endedBy: 'GUARD', minutes: 475, onDuty: false, lateMinutes: 20, earlyMinutes: 0 },
    { id: 's2', date: '2026-10-21', startedAt: '2026-10-21T00:30:00.000Z', endedAt: null, endedBy: null, minutes: 30, onDuty: true, lateMinutes: 0, earlyMinutes: 0 },
  ],
};

const renderScreen = async () => {
  const utils = render(<MyAttendanceScreen />);
  await act(async () => {});
  return utils;
};

describe('MyAttendanceScreen (the guard\'s own shift and attendance)', () => {
  beforeEach(() => {
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockReset();
  });

  it('shows the scheduled shift, the month totals and each shift', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: MONTH } });
    const { getByText } = await renderScreen();
    expect(getByText('Morning')).toBeTruthy();
    expect(getByText('06:00 – 14:00')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('90.0')).toBeTruthy();
    expect(getByText('20 min late')).toBeTruthy();
    expect(getByText('On duty now')).toBeTruthy();
    expect(getByText('Running')).toBeTruthy();
  });

  it('asks the server for the month on screen and moves back a month', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: MONTH } });
    const { getByLabelText } = await renderScreen();
    const first = (api.get as jest.Mock).mock.calls[0];
    expect(first[0]).toBe('/api/v1/guard/attendance/me');
    expect(first[1].params.month).toMatch(/^\d{4}-\d{2}$/);
    await act(async () => { fireEvent.press(getByLabelText('Previous month')); });
    const second = (api.get as jest.Mock).mock.calls[1];
    expect(second[1].params.month).not.toBe(first[1].params.month);
  });

  it('says so when no shift is set and nothing was recorded', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: { ...MONTH, scheduledShift: null, shifts: [], daysPresent: 0, totalMinutes: 0, lateCount: 0, earlyCount: 0, onDutyNow: false } } });
    const { getByText } = await renderScreen();
    expect(getByText('No shift is set for you yet. Ask the admin.')).toBeTruthy();
    expect(getByText('No duty recorded this month yet.')).toBeTruthy();
  });

  it('offers a retry when the server cannot be reached', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { data: MONTH } });
    const { getByText, queryByText } = await renderScreen();
    expect(getByText('Could not load attendance')).toBeTruthy();
    await act(async () => { fireEvent.press(getByText('Try again')); });
    expect(queryByText('Could not load attendance')).toBeNull();
    expect(getByText('Morning')).toBeTruthy();
  });
});
