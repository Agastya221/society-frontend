import { create } from 'zustand';

/** Bumped whenever a task alert arrives (new, cancelled), so an open Tasks screen reloads its list. */
export const useTasksSignal = create<{ tick: number; bump: () => void }>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
