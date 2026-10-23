import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AppAlert, AppAlertHost } from '@/components/gate/AppAlert';
import { useLanguageStore } from '@/i18n';

describe('AppAlert (in-app dialog instead of the Android system box)', () => {
  beforeEach(() => useLanguageStore.setState({ lang: 'en' }));

  it('shows the title and message with an OK button when no buttons are given', () => {
    const utils = render(<AppAlertHost />);
    act(() => AppAlert.show('Could not save', 'Try again.'));
    expect(utils.getByText('Could not save')).toBeTruthy();
    expect(utils.getByText('Try again.')).toBeTruthy();
    fireEvent.press(utils.getByText('OK'));
    expect(utils.queryByText('Could not save')).toBeNull();
  });

  it('runs the pressed button and closes', () => {
    const stop = jest.fn();
    const keep = jest.fn();
    const utils = render(<AppAlertHost />);
    act(() => AppAlert.show('Stop this visitor?', undefined, [
      { text: 'Keep', style: 'cancel', onPress: keep },
      { text: 'Stop', style: 'destructive', onPress: stop },
    ]));
    fireEvent.press(utils.getByText('Stop'));
    expect(stop).toHaveBeenCalled();
    expect(keep).not.toHaveBeenCalled();
    expect(utils.queryByText('Stop this visitor?')).toBeNull();
  });

  it('shows dialogs one after another', () => {
    const utils = render(<AppAlertHost />);
    act(() => {
      AppAlert.show('First');
      AppAlert.show('Second');
    });
    expect(utils.getByText('First')).toBeTruthy();
    expect(utils.queryByText('Second')).toBeNull();
    fireEvent.press(utils.getByText('OK'));
    expect(utils.getByText('Second')).toBeTruthy();
    fireEvent.press(utils.getByText('OK'));
  });

  it('treats the phone Back button as the cancel choice', () => {
    const keep = jest.fn();
    const leave = jest.fn();
    const utils = render(<AppAlertHost />);
    act(() => AppAlert.show('Log out?', undefined, [
      { text: 'Stay', style: 'cancel', onPress: keep },
      { text: 'Log out', style: 'destructive', onPress: leave },
    ]));
    fireEvent(utils.UNSAFE_getByType(require('react-native').Modal), 'requestClose');
    expect(keep).toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
  });

  it('labels the default button in Hindi for a Hindi guard', () => {
    useLanguageStore.setState({ lang: 'hi' });
    const utils = render(<AppAlertHost />);
    act(() => AppAlert.show('नहीं हो पाया'));
    expect(utils.getByText(/ठीक है/)).toBeTruthy();
    fireEvent.press(utils.getByText(/ठीक है/));
  });
});
