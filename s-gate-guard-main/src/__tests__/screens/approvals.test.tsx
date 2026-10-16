import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import api from '@/services/api';
import { useLanguageStore } from '@/i18n';
import ApprovalsScreen from '../../app/approvals';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(callback, []),
}));

const oldEnough = new Date(Date.now() - 60_000).toISOString();
const ready = { id: 'ready-1', visitorName: 'Asha Rao', type: 'VISITOR', flatLabel: 'A101', createdAt: oldEnough, status: 'APPROVED', entryId: null };
const waiting = { id: 'wait-1', visitorName: 'Ravi', type: 'DELIVERY', flatLabel: 'B204', createdAt: oldEnough, status: 'PENDING' };

const screen = async () => {
  const result = render(<ApprovalsScreen />);
  await act(async () => {});
  return result;
};

describe('Gate queue', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    (api.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: { data: {
      entryRequests: url.includes('status=REJECTED') || url.includes('status=EXPIRED') ? []
        : url.includes('awaitingEntry=true') ? [ready] : [waiting],
      pagination: { pages: 1, total: 1 },
    } } }));
    (api.patch as jest.Mock).mockResolvedValue({});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alertSpy.mockRestore());

  it('shows approved people before pending people', async () => {
    const result = await screen();
    const names = result.UNSAFE_getAllByType(require('react-native').Text)
      .map((node) => node.props.children)
      .filter((value) => value === 'Asha Rao' || value === 'Ravi');
    expect(names).toEqual(['Asha Rao', 'Ravi']);
    expect(result.getByText('Let in now')).toBeTruthy();
    expect(result.getByText('Approve myself')).toBeTruthy();
  });

  it('records physical entry only after the guard taps Let in now', async () => {
    const result = await screen();
    expect(api.patch).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(result.getByText('Let in now')); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/ready-1/admit');
  });

  it('requires confirmation to mark an approved visitor as left', async () => {
    const result = await screen();
    fireEvent.press(result.getByText('Left gate'));
    expect(api.patch).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>;
    await act(async () => { buttons.find((button) => button.text === 'Left gate')?.onPress?.(); });
    expect(api.patch).toHaveBeenCalledWith('/api/v1/gate/entry-requests/ready-1/no-show');
  });

  it('refreshes after a conflicting action by another guard', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Already recorded' } } });
    const result = await screen();
    (api.get as jest.Mock).mockClear();
    await act(async () => { fireEvent.press(result.getByText('Let in now')); });
    expect(alertSpy).toHaveBeenCalledWith('This request changed', 'Already recorded');
    expect(api.get).toHaveBeenCalled();
  });

  it('keeps a recent resident denial visible as a red stopped decision', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: { data: {
      entryRequests: url.includes('status=REJECTED')
        ? [{ ...waiting, id: 'denied-1', visitorName: 'Denied guest', status: 'REJECTED', rejectionReason: 'Not expected' }]
        : url.includes('status=EXPIRED') ? []
        : url.includes('awaitingEntry=true') ? [ready] : [waiting],
      pagination: { pages: 1, total: 1 },
    } } }));
    const result = await screen();
    expect(result.getByText('Denied guest')).toBeTruthy();
    expect(result.getByText('Not expected')).toBeTruthy();
    expect(result.getByText('Stopped · 1')).toBeTruthy();
  });
});
