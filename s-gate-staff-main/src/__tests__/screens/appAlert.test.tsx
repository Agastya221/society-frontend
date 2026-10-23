import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AppAlert, AppAlertHost } from '../../components/AppAlert';

describe('AppAlert (the app\'s own dialog)', () => {
  it('shows a message and closes with OK', () => {
    const screen = render(<AppAlertHost />);
    act(() => AppAlert.show('Saved', 'Your details were updated.'));
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Your details were updated.')).toBeTruthy();
    fireEvent.press(screen.getByText('OK'));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('runs the chosen button, and cancel does nothing else', () => {
    const screen = render(<AppAlertHost />);
    const onYes = jest.fn();
    act(() => AppAlert.show('Decline?', 'Say no to this request.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: onYes },
    ]));
    fireEvent.press(screen.getByText('Keep'));
    expect(onYes).not.toHaveBeenCalled();
    act(() => AppAlert.show('Decline?', 'Say no to this request.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: onYes },
    ]));
    fireEvent.press(screen.getByText('Decline'));
    expect(onYes).toHaveBeenCalledTimes(1);
  });

  it('shows dialogs one at a time, in order', () => {
    const screen = render(<AppAlertHost />);
    act(() => { AppAlert.show('First'); AppAlert.show('Second'); });
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.queryByText('Second')).toBeNull();
    fireEvent.press(screen.getByText('OK'));
    expect(screen.getByText('Second')).toBeTruthy();
  });
});
