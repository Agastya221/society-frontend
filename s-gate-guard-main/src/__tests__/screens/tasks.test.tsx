import { AppAlert } from '@/components/gate/AppAlert';
import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';

import TasksScreen, { TASK_POLL_MS } from '../../app/tasks';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const sweeper = { id: 's1', name: 'Sunita Sweeper', phone: '9000000001', staffType: 'CLEANER' };
const TASKS = [
  { id: 't1', title: 'Clean the lobby', status: 'ASSIGNED', createdAt: minutesAgo(4), block: { id: 'b1', name: 'Tower A' }, location: 'Ground floor', note: 'Near the lift', domesticStaff: sweeper },
  { id: 't2', title: 'Pick up the garbage', status: 'ACCEPTED', createdAt: minutesAgo(30), domesticStaff: sweeper },
  { id: 't3', title: 'Clean the stairs', status: 'DONE', createdAt: minutesAgo(120), domesticStaff: sweeper },
];
const STAFF = [{ ...sweeper, insideNow: true }, { id: 's2', name: 'Gopal Gardener', phone: '9000000002', staffType: 'GARDENER', insideNow: false }];
const PLACES = { blocks: [{ id: 'b1', name: 'Tower A' }, { id: 'b2', name: 'Tower B' }], commonAreas: ['Main gate', 'Parking'] };

const flush = async () => { await act(async () => {}); };
const mount = async () => { const utils = render(<TasksScreen />); await flush(); return utils; };
const route = (map: Record<string, unknown>) => (url: string) => {
  const hit = Object.keys(map).find((k) => url.endsWith(k));
  return Promise.resolve({ data: { data: hit ? map[hit] : [] } });
};

describe('Guard Tasks screen (give a job to staff)', () => {
  let alertSpy: jest.SpyInstance;
  let openSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockImplementation(route({ '/guard/staff-tasks': TASKS, '/guard/staff-tasks/staff': STAFF, '/emergencies/places': PLACES }));
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (api.patch as jest.Mock).mockResolvedValue({ data: { success: true } });
    alertSpy = jest.spyOn(AppAlert, 'show').mockImplementation(() => {});
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });
  afterEach(() => { alertSpy.mockRestore(); openSpy.mockRestore(); });

  it('lists the tasks with where they stand: waiting, accepted, done', async () => {
    const { getByText } = await mount();
    expect(getByText('Clean the lobby')).toBeTruthy();
    expect(getByText('Tower A · Ground floor')).toBeTruthy();
    expect(getByText('Waiting for Sunita Sweeper')).toBeTruthy();
    expect(getByText('Sunita Sweeper is on it')).toBeTruthy();
    expect(getByText('Sunita Sweeper finished it')).toBeTruthy();
    expect(getByText('Near the lift')).toBeTruthy();
  });

  it('only a task still to do has Call and Cancel', async () => {
    const { getByTestId, queryByTestId } = await mount();
    expect(getByTestId('call-t1')).toBeTruthy();
    expect(getByTestId('cancel-t2')).toBeTruthy();
    expect(queryByTestId('call-t3')).toBeNull();
    expect(queryByTestId('cancel-t3')).toBeNull();
  });

  it('Call opens the dialler with the staff member', async () => {
    const { getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByTestId('call-t1')); });
    expect(openSpy).toHaveBeenCalledWith('tel:9000000001');
  });

  it('cancelling asks first, then cancels and refreshes', async () => {
    const { getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByTestId('cancel-t1')); });
    expect(api.patch).not.toHaveBeenCalled();
    const [title, , buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Cancel this task?');
    await act(async () => { await buttons[0].onPress(); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/guard/staff-tasks/t1/cancel', {});
  });

  it('says so when there are no tasks, and offers a retry when the server cannot be reached', async () => {
    (api.get as jest.Mock).mockImplementation(route({ '/guard/staff-tasks': [] }));
    const empty = await mount();
    expect(empty.getByText('No tasks given yet')).toBeTruthy();
    empty.unmount();
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    const failed = await mount();
    expect(failed.getByText('Could not load tasks')).toBeTruthy();
  });

  it('gives a task: pick the staff, what, where, and it is sent', async () => {
    const { getByText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByText('Give a task')); });
    await flush();
    expect(getByText('Inside now', { exact: false })).toBeTruthy();
    fireEvent.press(getByTestId('staff-s1'));
    fireEvent.press(getByTestId('quick-tasks.quick1'));
    fireEvent.press(getByTestId('place-block-b2'));
    fireEvent.changeText(getByTestId('task-note'), 'Near the lift');
    await act(async () => { fireEvent.press(getByText('Give the task')); });
    expect(api.post).toHaveBeenCalledWith('/api/v1/guard/staff-tasks', { domesticStaffId: 's1', title: 'Clean the lobby', note: 'Near the lift', blockId: 'b2' });
    expect(alertSpy).toHaveBeenCalledWith('Task given', 'Sunita Sweeper has been told.');
  });

  it('a common area is sent as the place, and a typed task works too', async () => {
    const { getByText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByText('Give a task')); });
    await flush();
    fireEvent.press(getByTestId('staff-s2'));
    fireEvent.changeText(getByTestId('task-title'), 'Sweep the leaves');
    fireEvent.press(getByTestId('place-area-Parking'));
    await act(async () => { fireEvent.press(getByText('Give the task')); });
    const body = (api.post as jest.Mock).mock.calls[0][1];
    expect(body).toMatchObject({ domesticStaffId: 's2', title: 'Sweep the leaves', location: 'Parking' });
    expect(body.blockId).toBeUndefined();
  });

  it('cannot give a task until a staff member and a few words are chosen', async () => {
    const { getByText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByText('Give a task')); });
    await flush();
    await act(async () => { fireEvent.press(getByText('Give the task')); });
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('staff-s1'));
    await act(async () => { fireEvent.press(getByText('Give the task')); });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the server message when the task is refused (staff without the app)', async () => {
    (api.post as jest.Mock).mockRejectedValue({ response: { data: { message: 'This staff member does not use the staff app yet, so the task cannot reach them. Call them instead.' } } });
    const { getByText, getByTestId } = await mount();
    await act(async () => { fireEvent.press(getByText('Give a task')); });
    await flush();
    fireEvent.press(getByTestId('staff-s1'));
    fireEvent.press(getByTestId('quick-tasks.quick2'));
    await act(async () => { fireEvent.press(getByText('Give the task')); });
    expect(alertSpy).toHaveBeenCalledWith('Could not give the task', expect.stringContaining('Call them instead'));
  });

  it('says to call them when no staff member who uses the app is found', async () => {
    (api.get as jest.Mock).mockImplementation(route({ '/guard/staff-tasks': [], '/guard/staff-tasks/staff': [] }));
    const { getByText } = await mount();
    await act(async () => { fireEvent.press(getByText('Give a task')); });
    await flush();
    expect(getByText('No staff member who uses the app was found. Call them directly.')).toBeTruthy();
  });

  it('keeps the list fresh while the screen is open', async () => {
    jest.useFakeTimers();
    try {
      render(<TasksScreen />);
      await act(async () => {});
      (api.get as jest.Mock).mockClear();
      await act(async () => { jest.advanceTimersByTime(TASK_POLL_MS + 50); });
      expect(api.get).toHaveBeenCalledWith('/api/v1/guard/staff-tasks', { params: { scope: 'all' } });
    } finally {
      jest.useRealTimers();
    }
  });

  it('speaks Hindi for guards', async () => {
    useLanguageStore.setState({ lang: 'hi' });
    const { getByText } = await mount();
    expect(getByText('काम दें')).toBeTruthy();
  });
});
