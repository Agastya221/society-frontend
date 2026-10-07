import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import api from '@/services/api';

import NewEntryScreen from '../../app/new-entry';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const FLAT = { id: 'flat-1', flatNumber: 'A101', block: { name: 'Tower A' }, residents: [{ name: 'Meera' }] };
const FLAT_LABEL = 'Tower A-A101';
const SEARCH_PLACEHOLDER = 'Search flat — A-101, B-204…';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

const pickFlat = async (utils: ReturnType<typeof render>) => {
  fireEvent.changeText(utils.getByPlaceholderText(SEARCH_PLACEHOLDER), 'A10');
  await waitFor(() => expect(utils.getByText('Meera')).toBeTruthy());
  fireEvent.press(utils.getByText('Meera'));
};

const entryPosts = () => (api.post as jest.Mock).mock.calls.filter((c) => c[0] === '/api/v1/gate/entry-requests');

describe('NewEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [FLAT] } });
    (api.post as jest.Mock).mockResolvedValue({ data: { data: { entryRequest: { id: 'er-1' } } } });
  });

  it('renders visitor types and the optional visitor name field', () => {
    const { getByText, getByPlaceholderText } = render(<NewEntryScreen />);
    for (const label of ['Guest', 'Delivery', 'Cab', 'Service']) expect(getByText(label)).toBeTruthy();
    expect(getByText(/VISITOR NAME/)).toBeTruthy();
    expect(getByText('OPTIONAL')).toBeTruthy();
    expect(getByPlaceholderText('Name shown to the resident')).toBeTruthy();
  });

  it('relabels the name field for deliveries', () => {
    const { getByText, getByPlaceholderText } = render(<NewEntryScreen />);
    fireEvent.press(getByText('Delivery'));
    expect(getByText(/DELIVERY PERSON NAME/)).toBeTruthy();
    expect(getByPlaceholderText('e.g. Ravi')).toBeTruthy();
  });

  it('does not submit without a flat', async () => {
    const utils = render(<NewEntryScreen />);
    await act(async () => { fireEvent.press(utils.getByText('Notify Resident')); });
    expect(entryPosts()).toHaveLength(0);
  });

  it('searches flats and fills the input with the picked flat label', async () => {
    const utils = render(<NewEntryScreen />);
    await pickFlat(utils);
    expect(api.get).toHaveBeenCalledWith('/api/v1/gate/flats/search?query=A10');
    expect(utils.getByPlaceholderText(SEARCH_PLACEHOLDER).props.value).toBe(FLAT_LABEL);
  });

  it('sends a trimmed, collapsed visitor name and opens the waiting screen', async () => {
    const utils = render(<NewEntryScreen />);
    await pickFlat(utils);
    fireEvent.changeText(utils.getByPlaceholderText('Name shown to the resident'), '  Asha   Rao ');
    await act(async () => { fireEvent.press(utils.getByText('Notify Resident')); });

    expect(api.post).toHaveBeenCalledWith('/api/v1/gate/entry-requests', {
      type: 'VISITOR', flatId: 'flat-1', visitorName: 'Asha Rao',
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/entry-waiting',
      params: { id: 'er-1', flat: FLAT_LABEL, name: 'Asha Rao', type: 'GUEST', photo: '' },
    });
  });

  it('omits visitorName when the field is blank', async () => {
    const utils = render(<NewEntryScreen />);
    await pickFlat(utils);
    fireEvent.changeText(utils.getByPlaceholderText('Name shown to the resident'), '   ');
    await act(async () => { fireEvent.press(utils.getByText('Notify Resident')); });
    expect(entryPosts()[0][1]).toEqual({ type: 'VISITOR', flatId: 'flat-1' });
  });

  it('submits only once on a double tap', async () => {
    const post = deferred<unknown>();
    (api.post as jest.Mock).mockImplementation(() => post.promise);
    const utils = render(<NewEntryScreen />);
    await pickFlat(utils);

    const submit = utils.getByText('Notify Resident');
    act(() => { fireEvent.press(submit); fireEvent.press(submit); });
    await act(async () => { post.resolve({ data: { data: { id: 'er-2' } } }); });

    expect(entryPosts()).toHaveLength(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('shows an alert and stays on the form when the request fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Flat not found' } } });
    const utils = render(<NewEntryScreen />);
    await pickFlat(utils);
    await act(async () => { fireEvent.press(utils.getByText('Notify Resident')); });
    expect(alertSpy).toHaveBeenCalledWith('Failed', 'Flat not found');
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
