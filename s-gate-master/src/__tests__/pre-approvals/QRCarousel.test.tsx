import { fireEvent, render } from '@testing-library/react-native';

import { QRCarousel } from '@/components/pre-approvals/QRCarousel';

test('keeps multiple guest passes visible until Done is pressed', () => {
    const onDone = jest.fn();
    const passes = [
        { id: 'one', code: 'ABC123', name: 'First Guest' },
        { id: 'two', code: 'DEF456', name: 'Second Guest' },
    ];

    const screen = render(<QRCarousel passes={passes} onDone={onDone} />);

    expect(screen.getByText('Guest 1 of 2')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
});
