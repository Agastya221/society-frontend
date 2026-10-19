import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../services/api', () => ({ api: { get: jest.fn(), patch: jest.fn() }, API_URL: 'https://x' }));
import { api } from '../../services/api';
import { AppAlertHost } from '../../components/AppAlert';
import Bookings from '../../../app/bookings';

const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
const request = (over: Record<string, unknown> = {}) => ({
  id: 'b1', status: 'PENDING', date: tomorrow, bookingDate: tomorrow, startTime: '10:00', endTime: '12:00',
  workType: 'Cleaning', flat: { flatNumber: 'A101' }, ...over,
});

const mountWith = async (rows: unknown[]) => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: rows } });
  const screen = render(<><Bookings /><AppAlertHost /></>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  return screen;
};

describe('Staff Bookings (work requests)', () => {
  beforeEach(() => { jest.clearAllMocks(); (api.patch as jest.Mock).mockResolvedValue({ data: {} }); });

  it('lists the requests that came in', async () => {
    const screen = await mountWith([request()]);
    expect(await screen.findByText(/Cleaning/)).toBeTruthy();
  });

  it('says there is no work when the list is empty', async () => {
    const screen = await mountWith([]);
    expect(await screen.findByText(/No work requests/i)).toBeTruthy();
  });

  it('shows a retry message instead of "no work" when the server cannot be reached', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    const screen = render(<Bookings />);
    expect(await screen.findByText(/Could not load requests/i)).toBeTruthy();
    expect(screen.queryByText(/No work requests/i)).toBeNull();
  });

  it('accepting a request calls the server once even on a double tap', async () => {
    const screen = await mountWith([request()]);
    const accept = await screen.findByText(/Accept/i);
    await act(async () => { fireEvent.press(accept); fireEvent.press(accept); });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect((api.patch as jest.Mock).mock.calls[0][0]).toBe('/staff-app/bookings/b1/accept');
  });
});
