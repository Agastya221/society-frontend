import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/useAuthStore';
import type { User } from '../../types/auth';
import { BASE_URL } from '../../constants/api';

const mockGuardUser: User = {
  id: 'guard-1',
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  phone: '9123456789',
  role: 'GUARD',
  guardId: 'g-001',
  gate: 'Main Gate',
  shift: 'MORNING',
} as User;

const ACCESS_TOKEN = 'guard-access-token';
const REFRESH_TOKEN = 'guard-refresh-token';

const resetStore = () =>
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

describe('useAuthStore (s-gate-guard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps queued mock*Once values; drop them so one test's unused
    // fetch response can't leak into the next.
    (global.fetch as jest.Mock).mockReset();
    resetStore();
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.isAuthenticated).toBe(false);
      expect(s.user).toBeNull();
      expect(s.isLoading).toBe(true);
    });
  });

  // ── login() ────────────────────────────────────────────────────────────────
  describe('login()', () => {
    beforeEach(() => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('sets accessToken, refreshToken, user, and isAuthenticated', async () => {
      await useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockGuardUser);
      const s = useAuthStore.getState();
      expect(s.accessToken).toBe(ACCESS_TOKEN);
      expect(s.refreshToken).toBe(REFRESH_TOKEN);
      expect(s.user).toEqual(mockGuardUser);
      expect(s.isAuthenticated).toBe(true);
      expect(s.isLoading).toBe(false);
    });

    it('saves tokens to SecureStore', async () => {
      await useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockGuardUser);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', ACCESS_TOKEN);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', REFRESH_TOKEN);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(mockGuardUser));
    });

    it('throws when SecureStore write fails', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('no space'));
      await expect(
        useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockGuardUser),
      ).rejects.toThrow('Failed to save authentication data');
    });
  });

  // ── logout() ───────────────────────────────────────────────────────────────
  describe('logout()', () => {
    beforeEach(() => {
      useAuthStore.setState({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        user: mockGuardUser,
        isAuthenticated: true,
        isLoading: false,
      });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('clears all auth state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await useAuthStore.getState().logout();
      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
      expect(s.isAuthenticated).toBe(false);
    });

    it('deletes accessToken, refreshToken, auth_user from SecureStore', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await useAuthStore.getState().logout();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
    });

    it('clears state even if backend call fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── loadToken() ────────────────────────────────────────────────────────────
  describe('loadToken()', () => {
    it('restores guard session from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN)
        .mockResolvedValueOnce(JSON.stringify(mockGuardUser));

      await useAuthStore.getState().loadToken();
      const s = useAuthStore.getState();
      expect(s.accessToken).toBe(ACCESS_TOKEN);
      expect(s.user).toEqual(mockGuardUser);
      expect(s.isAuthenticated).toBe(true);
      expect(s.isLoading).toBe(false);
    });

    it('clears a stored non-guard session instead of restoring it', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN)
        .mockResolvedValueOnce(JSON.stringify({ ...mockGuardUser, role: 'SUPER_ADMIN' }));

      await useAuthStore.getState().loadToken();
      const s = useAuthStore.getState();
      expect(s.isAuthenticated).toBe(false);
      expect(s.user).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
    });

    it('stays unauthenticated when no tokens stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await useAuthStore.getState().loadToken();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('handles errors without crashing', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));
      await useAuthStore.getState().loadToken();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── refreshAccessToken() ───────────────────────────────────────────────────
  describe('refreshAccessToken()', () => {
    it('fetches new tokens and updates store', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN });
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
        }),
      });

      const token = await useAuthStore.getState().refreshAccessToken();
      expect(token).toBe('new-access');
      expect(useAuthStore.getState().accessToken).toBe('new-access');
    });

    it('throws and logs out when no refresh token', async () => {
      useAuthStore.setState({ refreshToken: null });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow(
        'No refresh token available',
      );
    });

    it('throws WITHOUT logging out when the backend returns invalid tokens (not a 401/403)', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { accessToken: null, refreshToken: null } }),
      });
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow();
      // Only one fetch call (the refresh itself) — no logout call was made, and the
      // session is still intact for the caller to retry.
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('logs out when the refresh call itself returns 401', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ success: false, message: 'Invalid refresh token' }) })
        .mockResolvedValueOnce({ ok: true }); // logout call
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('logs out when the refresh call itself returns 403', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 403, json: () => Promise.resolve({ success: false, message: 'Revoked' }) })
        .mockResolvedValueOnce({ ok: true }); // logout call
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('keeps the session on a network error (does not log out)', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Network request failed');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('keeps the session on a 429 from the refresh endpoint', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false, status: 429,
        json: () => Promise.resolve({ success: false, message: 'Too many requests' }),
      });
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Too many requests');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().refreshToken).toBe(REFRESH_TOKEN);
    });

    it('keeps the session when the refresh call times out (AbortError)', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      (global.fetch as jest.Mock).mockRejectedValueOnce(abort);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Aborted');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('calls the configured base URL with an abort signal', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN });
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, data: { accessToken: 'a', refreshToken: 'r' } }),
      });
      await useAuthStore.getState().refreshAccessToken();
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/v1/auth/refresh-token`);
      expect(init.signal).toBeDefined();
    });

    it('aborts a hung refresh call after 15 s', async () => {
      jest.useFakeTimers();
      try {
        useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
        (global.fetch as jest.Mock).mockImplementationOnce((_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
          }));
        const pending = useAuthStore.getState().refreshAccessToken();
        jest.advanceTimersByTime(15000);
        await expect(pending).rejects.toThrow('Aborted');
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('keeps the session on a 5xx from the refresh endpoint', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN, isAuthenticated: true });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false, status: 503,
        json: () => Promise.resolve({ success: false, message: 'Service unavailable' }),
      });
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Service unavailable');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  // ── setLoading() ───────────────────────────────────────────────────────────
  describe('setLoading()', () => {
    it('toggles isLoading', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });
});
