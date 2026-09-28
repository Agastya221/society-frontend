import { act, renderHook } from '@testing-library/react-native';

import { useSheetStepper } from '@/components/pre-approvals/sheet/useSheetStepper';

test('tracks the actual route through guest steps and resets on reopen', () => {
    type Step = 'select' | 'guest_type' | 'form' | 'guests' | 'guest_list';
    const { result } = renderHook(() => useSheetStepper<Step>('select'));

    act(() => {
        result.current.go('guest_type');
        result.current.go('form');
        result.current.go('guests');
        result.current.go('guest_list');
        result.current.go('guest_list');
    });

    expect(result.current.step).toBe('guest_list');
    act(() => { expect(result.current.back()).toBe(true); });
    expect(result.current.step).toBe('guests');
    act(() => { expect(result.current.back()).toBe(true); });
    expect(result.current.step).toBe('form');

    act(() => result.current.reset('select'));
    expect(result.current.step).toBe('select');
    expect(result.current.back()).toBe(false);
});
