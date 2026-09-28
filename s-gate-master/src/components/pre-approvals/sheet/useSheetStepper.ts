import { useCallback, useRef, useState } from 'react';

/**
 * Step navigation for a multi-step sheet.
 *
 * The old sheet drove `setStep` from ~13 call sites and rebuilt the "where does
 * back go from here" rule at each one, which is why going back from some steps
 * skipped a screen or dead-ended. Here the trail is recorded as you move, so
 * back is always simply "the step you came from".
 */
export function useSheetStepper<Step extends string>(initial: Step) {
    const [step, setStep] = useState<Step>(initial);
    /** Which way the last move went, so the transition knows how to slide. */
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const trail = useRef<Step[]>([]);
    const currentStep = useRef(initial);

    /** Move forward, remembering where we came from. */
    const go = useCallback((next: Step) => {
        if (currentStep.current === next) return;
        trail.current.push(currentStep.current);
        currentStep.current = next;
        setDirection('forward');
        setStep(next);
    }, []);

    /** Replace the current step without adding a back entry (e.g. a redirect). */
    const replace = useCallback((next: Step) => {
        currentStep.current = next;
        setDirection('forward');
        setStep(next);
    }, []);

    /**
     * Step back through the trail.
     * @returns false when there is nowhere left to go, so the caller can close.
     */
    const back = useCallback(() => {
        const previous = trail.current.pop();
        if (previous === undefined) return false;
        currentStep.current = previous;
        setDirection('back');
        setStep(previous);
        return true;
    }, []);

    /** Start over — used when the sheet reopens. */
    const reset = useCallback((to: Step) => {
        trail.current = [];
        currentStep.current = to;
        setDirection('forward');
        setStep(to);
    }, []);

    return { step, direction, go, back, replace, reset, canGoBack: () => trail.current.length > 0 };
}
