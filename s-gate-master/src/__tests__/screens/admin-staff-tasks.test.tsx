import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));

import api from '@/services/api';
import { AppAlert } from '@/components/ui/AppAlert';
import StaffTasksScreen from '@/app/(admin)/staff-tasks';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const sweeper = { id: 's1', name: 'Sunita Sweeper', phone: '9000000001', staffType: 'CLEANER' };
const TASKS = [
  { id: 't1', title: 'Clean the lobby', status: 'ASSIGNED', createdAt: minutesAgo(4), block: { id: 'b1', name: 'Tower A' }, location: 'Ground floor', domesticStaff: sweeper, createdBy: { id: 'g1', name: 'Ramesh' } },
  { id: 't2', title: 'Clean the stairs', status: 'DONE', createdAt: minutesAgo(90), domesticStaff: sweeper, createdBy: { id: 'a1', name: 'Admin' } },
];
const STAFF = [{ ...sweeper, insideNow: true }];
const PLACES = { blocks: [{ id: 'b1', name: 'Tower A' }], commonAreas: ['Main gate'] };

const route = (map: Record<string, unknown>) => (url: string) => {
  const hit = Object.keys(map).find((k) => url.endsWith(k));
  return Promise.resolve({ data: { data: hit ? map[hit] : [] } });
};
const mount = async () => { const utils = render(<StaffTasksScreen />); await act(async () => {}); return utils; };

describe('Admin: tasks for staff', () => {
  let openSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockImplementation(route({ '/admin/staff-tasks': TASKS, '/admin/staff-tasks/staff': STAFF, '/emergencies/places': PLACES }));
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (api.patch as jest.Mock).mockResolvedValue({ data: { success: true } });
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    alertSpy = jest.spyOn(AppAlert, 'show').mockImplementation(() => {});
  });
  afterEach(() => { openSpy.mockRestore(); alertSpy.mockRestore(); });

  it('lists the tasks with where they stand and who gave them', async () => {
    const { getByText } = await mount();
    expect(getByText('Clean the lobby')).toBeTruthy();
    expect(getByText('Tower A · Ground floor')).toBeTruthy();
    expect(getByText('Waiting for Sunita Sweeper')).toBeTruthy();
    expect(getByText('Sunita Sweeper finished it')).toBeTruthy();
    expect(getByText(/given by Ramesh/)).toBeTruthy();
  });

  it('only an open task has Call and Cancel; Call opens the dialler', async () => {
    const { getByTestId, queryByTestId } = await mount();
    expect(queryByTestId('cancel-t2')).toBeNull();
    await act(async () => { fireEvent.press(getByTestId('call-t1')); });
    expect(openSpy).toHaveBeenCalledWith('tel:9000000001');
  });

  it('cancelling asks first, then cancels the task', async () => {
    const { getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByTestId('cancel-t1')); });
    expect(api.patch).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2];
    await act(async () => { await buttons[1].onPress(); });
    expect(api.patch).toHaveBeenCalledWith('/admin/staff-tasks/t1/cancel', {});
  });

  it('gives a task from the admin: staff, what, where, note', async () => {
    const { getByLabelText, getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByLabelText('Give a task')); });
    await act(async () => {});
    fireEvent.press(getByTestId('staff-s1'));
    fireEvent.press(getByTestId('quick-Clean the parking'));
    fireEvent.press(getByTestId('place-area-Main gate'));
    fireEvent.changeText(getByTestId('task-note'), 'Before 9 am');
    await act(async () => { fireEvent.press(getByTestId('give-task')); });
    expect(api.post).toHaveBeenCalledWith('/admin/staff-tasks', { domesticStaffId: 's1', title: 'Clean the parking', note: 'Before 9 am', location: 'Main gate' });
    expect(alertSpy).toHaveBeenCalledWith('Task given', 'Sunita Sweeper has been told.');
  });

  it('cannot give a task before choosing a staff member and saying what', async () => {
    const { getByLabelText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByLabelText('Give a task')); });
    await act(async () => {});
    await act(async () => { fireEvent.press(getByTestId('give-task')); });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the server message when a task is refused', async () => {
    (api.post as jest.Mock).mockRejectedValue({ response: { data: { message: 'This staff member does not use the staff app yet, so the task cannot reach them. Call them instead.' } } });
    const { getByLabelText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByLabelText('Give a task')); });
    await act(async () => {});
    fireEvent.press(getByTestId('staff-s1'));
    fireEvent.press(getByTestId('quick-Clean the lobby'));
    await act(async () => { fireEvent.press(getByTestId('give-task')); });
    expect(alertSpy).toHaveBeenCalledWith('Could not give the task', expect.stringContaining('Call them instead'));
  });

  it('says so when there are no tasks yet', async () => {
    (api.get as jest.Mock).mockImplementation(route({ '/admin/staff-tasks': [] }));
    const { getByText } = await mount();
    expect(getByText('No tasks given yet')).toBeTruthy();
  });
});
