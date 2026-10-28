import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('@/hooks/useSheetBottomClearance', () => ({ useSheetBottomClearance: () => 0 }));
jest.mock('@/services/uploadService', () => ({ uploadImage: jest.fn() }));
jest.mock('@/services/staffService', () => ({
  getStaffList: jest.fn(),
  getStaffAttendance: jest.fn(() => Promise.resolve([])),
  getAssignableFlats: jest.fn(() => Promise.resolve([])),
  createDomesticStaff: jest.fn(),
  updateDomesticStaff: jest.fn(),
  assignStaffToFlat: jest.fn(),
}));

import { getStaffList } from '@/services/staffService';
import SharedStaffScreen from '@/components/staff/SharedStaffScreen';

const since = new Date(Date.now() - 2 * 3_600_000).toISOString();
const PEOPLE = [
  { id: 'g1', name: 'Ramesh Kumar', phone: '9000000001', role: 'GUARD', status: 'ACTIVE', source: 'USER', salary: null, shiftStart: '06:00', shiftEnd: '14:00', assignedFlats: ['SOCIETY'], createdAt: '2026-01-05T00:00:00Z', email: 'ramesh@example.com', lastLogin: since, shift: { name: 'Morning', startTime: '06:00', endTime: '14:00', graceMinutes: 10 }, dutyNow: { since, gate: 'Main gate' } },
  { id: 'g2', name: 'Suresh Yadav', phone: '9000000002', role: 'GUARD', status: 'ACTIVE', source: 'USER', salary: null, shiftStart: null, shiftEnd: null, assignedFlats: ['SOCIETY'], createdAt: '2026-02-05T00:00:00Z', email: null, lastLogin: null, shift: null, dutyNow: null },
  { id: 'g3', name: 'Mohan Singh', phone: '9000000003', role: 'GUARD', status: 'ACTIVE', source: 'USER', salary: null, shiftStart: null, shiftEnd: null, assignedFlats: ['SOCIETY'], createdAt: '2026-02-06T00:00:00Z', shift: null, dutyNow: { since, gate: null } },
  { id: 's1', name: 'Savita Bai', phone: '9000000010', role: 'MAID', status: 'ACTIVE', source: 'DOMESTIC', salary: 3000, shiftStart: '09:00', shiftEnd: '12:00', assignedFlats: ['A-101', 'B-204'], createdAt: '2026-03-01T00:00:00Z', insideNow: true, workingDays: ['MON', 'TUE'] },
  { id: 's2', name: 'Ravi Cook', phone: '9000000011', role: 'COOK', status: 'ACTIVE', source: 'DOMESTIC', salary: null, shiftStart: null, shiftEnd: null, assignedFlats: [], createdAt: '2026-03-02T00:00:00Z' },
];

const mount = async () => { const utils = render(<SharedStaffScreen />); await act(async () => {}); return utils; };

describe('Admin Staff directory: two lists, guards and other staff', () => {
  let openSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    (getStaffList as jest.Mock).mockResolvedValue(PEOPLE);
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });
  afterEach(() => openSpy.mockRestore());

  it('opens on the guards, with counts for both lists and how many are on duty', async () => {
    const { getByText, queryByText } = await mount();
    expect(getByText('Guards (3)')).toBeTruthy();
    expect(getByText('Other staff (2)')).toBeTruthy();
    expect(getByText('2 on duty now')).toBeTruthy();
    expect(getByText('Ramesh Kumar')).toBeTruthy();
    expect(queryByText('Savita Bai')).toBeNull();
  });

  it('a guard card shows the shift, the gate and since when', async () => {
    const { getByText, getAllByText } = await mount();
    expect(getByText('Morning · 06:00–14:00')).toBeTruthy();
    expect(getByText('At Main gate')).toBeTruthy();
    expect(getAllByText(/^Since /).length).toBe(2); // the two guards on duty
  });

  it('a guard who is off duty says so, and one with no shift says that', async () => {
    const { getByText, getAllByText } = await mount();
    expect(getByText('Off duty')).toBeTruthy();
    expect(getAllByText('No shift').length).toBeGreaterThan(0);
  });

  it('a guard on duty with no gate known still shows as on duty', async () => {
    const { getAllByText } = await mount();
    expect(getAllByText('On duty').length).toBeGreaterThan(0);
  });

  it('switches to the other staff with their flats', async () => {
    const { getByTestId, getByText, queryByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('group-STAFF')); });
    expect(getByText('Savita Bai')).toBeTruthy();
    expect(getByText('2 Flats')).toBeTruthy();
    expect(getByText('Inside the society now')).toBeTruthy();
    expect(queryByText('Ramesh Kumar')).toBeNull();
  });

  it('opens a guard profile with the details, and can call and jump to shifts and attendance', async () => {
    const { getByTestId, getByText, getAllByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('guard-g1')); });
    expect(getAllByText('Security guard').length).toBeGreaterThan(1); // the card and the profile
    expect(getByText('ramesh@example.com')).toBeTruthy();
    expect(getByText('Morning, 06:00 to 14:00 (10 min grace)')).toBeTruthy();
    expect(getByText('Main gate')).toBeTruthy();
    await act(async () => { fireEvent.press(getByTestId('guard-call')); });
    expect(openSpy).toHaveBeenCalledWith('tel:9000000001');
    await act(async () => { fireEvent.press(getByTestId('guard-shifts')); });
    expect(mockPush).toHaveBeenCalledWith('/(admin)/guard-shifts');
  });

  it('a guard profile with nothing set says so instead of showing blanks', async () => {
    const { getByTestId, getByText } = await mount();
    await act(async () => { fireEvent.press(getByTestId('guard-g2')); });
    expect(getByText('No shift assigned')).toBeTruthy();
    expect(getByText('Not on duty')).toBeTruthy();
    expect(getByText('Never')).toBeTruthy();
  });

  it('search finds a guard by name', async () => {
    const { getByPlaceholderText, queryByText, getByText } = await mount();
    fireEvent.changeText(getByPlaceholderText('Search by name, role, or phone...'), 'suresh');
    expect(getByText('Suresh Yadav')).toBeTruthy();
    expect(queryByText('Ramesh Kumar')).toBeNull();
  });
});
