import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * One screen back, or Home when there is nothing behind (the screen was opened from a link or a
 * restored session). A plain router.back() then does nothing and the guard is stuck on the screen.
 */
export function backOrHome(router: AppRouter) {
  if (router.canGoBack?.() === false) router.replace('/');
  else router.back();
}
