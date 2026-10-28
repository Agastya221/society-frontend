import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../services/api', () => ({ api: { get: jest.fn(), patch: jest.fn() }, API_URL: 'https://x/api/v1' }));
import { api } from '../../services/api';
import { AppAlertHost } from '../../components/AppAlert';
import Tasks from '../../../app/tasks';

const task = (over: Record<string, unknown> = {}) => ({
  id: 't1', title: 'Clean the lobby', status: 'ASSIGNED', note: 'Near the lift',
  block: { id: 'b1', name: 'Tower A' }, location: 'Ground floor',
  createdAt: new Date(Date.now() - 5 * 60000).toISOString(), createdBy: { id: 'g1', name: 'Ramesh', role: 'GUARD' }, ...over,
});

const mountWith = async (rows: unknown[]) => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: rows } });
  const screen = render(<><Tasks /><AppAlertHost /></>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  return screen;
};

describe('Staff Tasks (jobs from security or the admin)', () => {
  beforeEach(() => { jest.clearAllMocks(); (api.patch as jest.Mock).mockResolvedValue({ data: {} }); });

  it('lists a new task with what, where, who gave it and when', async () => {
    const screen = await mountWith([task()]);
    expect(await screen.findByText('Clean the lobby')).toBeTruthy();
    expect(screen.getByText('Tower A · Ground floor')).toBeTruthy();
    expect(screen.getByText(/From Ramesh \(security\) · 5 min ago/)).toBeTruthy();
    expect(screen.getByText('Near the lift')).toBeTruthy();
    expect(screen.getByText('NEW')).toBeTruthy();
  });

  it('says there are no tasks when the list is empty, and a retry message when the server cannot be reached', async () => {
    const empty = await mountWith([]);
    expect(await empty.findByText('No tasks')).toBeTruthy();
    empty.unmount();
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    const failed = render(<Tasks />);
    expect(await failed.findByText('Could not load tasks')).toBeTruthy();
    expect(failed.queryByText('No tasks')).toBeNull();
  });

  it('accepting a task calls the server once even on a double tap, then shows it as accepted', async () => {
    const screen = await mountWith([task()]);
    const accept = await screen.findByTestId('accept-t1');
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [task({ status: 'ACCEPTED' })] } });
    await act(async () => { fireEvent.press(accept); fireEvent.press(accept); });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect((api.patch as jest.Mock).mock.calls[0][0]).toBe('/staff-app/tasks/t1/accept');
    expect(await screen.findByText('ACCEPTED')).toBeTruthy();
    expect(screen.queryByTestId('accept-t1')).toBeNull();
    expect(screen.getByTestId('done-t1')).toBeTruthy();
  });

  it('marking a task done calls the done route', async () => {
    const screen = await mountWith([task({ status: 'ACCEPTED' })]);
    await act(async () => { fireEvent.press(await screen.findByTestId('done-t1')); });
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect((api.patch as jest.Mock).mock.calls[0][0]).toBe('/staff-app/tasks/t1/done');
  });

  it('a finished or cancelled task shows no buttons', async () => {
    const screen = await mountWith([task({ id: 'd', status: 'DONE' }), task({ id: 'c', status: 'CANCELLED' })]);
    expect(await screen.findByText('DONE')).toBeTruthy();
    expect(screen.getByText('CANCELLED')).toBeTruthy();
    expect(screen.queryByTestId('done-d')).toBeNull();
    expect(screen.queryByTestId('accept-c')).toBeNull();
  });

  it('shows the server message when the update is refused', async () => {
    (api.patch as jest.Mock).mockRejectedValue({ response: { data: { message: 'This task was cancelled' } } });
    const screen = await mountWith([task()]);
    await act(async () => { fireEvent.press(await screen.findByTestId('accept-t1')); });
    expect(await screen.findByText('This task was cancelled')).toBeTruthy();
  });
});
