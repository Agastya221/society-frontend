import { create } from 'zustand';

/** Bumped whenever a work-request alert arrives, so an open Work requests screen reloads its list. */
export const useBookingsSignal = create<{ tick: number; bump: () => void }>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
