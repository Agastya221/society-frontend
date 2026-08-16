import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/useAuthStore';
import type { User } from '../../types/auth';

const mockUser: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  role: 'RESIDENT',
} as User;

const ACCESS_TOKEN = 'mock-access-token';
const REFRESH_TOKEN = 'mock-refresh-token';

const resetStore = () =>
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    user: null,
    role: null,
    appType: null,
    requiresOnboarding: false,
    onboardingStatus: null,
    isLoading: true,
  });

describe('useAuthStore (s-gate-master)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts unauthenticated with null tokens', () => {
      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.isAuthenticated).toBe(false);
      expect(s.user).toBeNull();
      expect(s.role).toBeNull();
      expect(s.isLoading).toBe(true);
    });
  });

  // ── login() ────────────────────────────────────────────────────────────────
  describe('login()', () => {
    beforeEach(() => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('sets tokens, user, role, and isAuthenticated', async () => {
      await useAuthStore.getState().login(
        ACCESS_TOKEN, REFRESH_TOKEN, mockUser, 'RESIDENT', false, null,
      );
      const s = useAuthStore.getState();
      expect(s.accessToken).toBe(ACCESS_TOKEN);
      expect(s.refreshToken).toBe(REFRESH_TOKEN);
      expect(s.user).toEqual(mockUser);
      expect(s.role).toBe('RESIDENT');
      expect(s.isAuthenticated).toBe(true);
      expect(s.isLoading).toBe(false);
    });

    it('persists accessToken, refreshToken, and user to SecureStore', async () => {
      await useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockUser);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', ACCESS_TOKEN);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', REFRESH_TOKEN);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
    });

    it('persists appType when provided', async () => {
      await useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockUser, 'RESIDENT');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_app_type', 'RESIDENT');
    });

    it('persists requiresOnboarding flag', async () => {
      await useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockUser, undefined, true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('requiresOnboarding', 'true');
    });

    it('throws "Failed to save authentication data" when SecureStore fails', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('disk full'));
      await expect(
        useAuthStore.getState().login(ACCESS_TOKEN, REFRESH_TOKEN, mockUser),
      ).rejects.toThrow('Failed to save authentication data');
    });
  });

  // ── logout() ───────────────────────────────────────────────────────────────
  describe('logout()', () => {
    beforeEach(() => {
      useAuthStore.setState({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        user: mockUser,
        isAuthenticated: true,
        role: 'RESIDENT',
        isLoading: false,
      });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('resets all state to unauthenticated', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      await useAuthStore.getState().logout();
      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
      expect(s.role).toBeNull();
      expect(s.isAuthenticated).toBe(false);
      expect(s.isLoading).toBe(false);
    });

    it('deletes all SecureStore keys', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await useAuthStore.getState().logout();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_app_type');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('requiresOnboarding');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('onboardingStatus');
    });

    it('still clears state even if backend logout call fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('calls backend logout with Authorization header', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await useAuthStore.getState().logout();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
        }),
      );
    });
  });

  // ── loadToken() ────────────────────────────────────────────────────────────
  describe('loadToken()', () => {
    it('restores authenticated state from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN)
        .mockResolvedValueOnce(JSON.stringify(mockUser))
        .mockResolvedValueOnce('RESIDENT')
        .mockResolvedValueOnce('false')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('[]');

      await useAuthStore.getState().loadToken();
      const s = useAuthStore.getState();
      expect(s.accessToken).toBe(ACCESS_TOKEN);
      expect(s.user).toEqual(mockUser);
      expect(s.role).toBe(mockUser.role);
      expect(s.isAuthenticated).toBe(true);
      expect(s.isLoading).toBe(false);
    });

    it('sets isLoading false with no stored tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await useAuthStore.getState().loadToken();
      const s = useAuthStore.getState();
      expect(s.isAuthenticated).toBe(false);
      expect(s.isLoading).toBe(false);
    });

    it('parses requiresOnboarding as boolean', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN)
        .mockResolvedValueOnce(JSON.stringify(mockUser))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('PENDING')
        .mockResolvedValueOnce('[]');

      await useAuthStore.getState().loadToken();
      expect(useAuthStore.getState().requiresOnboarding).toBe(true);
      expect(useAuthStore.getState().onboardingStatus).toBe('PENDING');
    });

    it('handles SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore unavailable'));
      await useAuthStore.getState().loadToken();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── refreshAccessToken() ───────────────────────────────────────────────────
  describe('refreshAccessToken()', () => {
    const NEW_ACCESS = 'new-access-token';
    const NEW_REFRESH = 'new-refresh-token';

    beforeEach(() => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('fetches new tokens and updates state', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { accessToken: NEW_ACCESS, refreshToken: NEW_REFRESH } }),
      });

      const result = await useAuthStore.getState().refreshAccessToken();
      expect(result).toBe(NEW_ACCESS);
      expect(useAuthStore.getState().accessToken).toBe(NEW_ACCESS);
      expect(useAuthStore.getState().refreshToken).toBe(NEW_REFRESH);
    });

    it('throws and calls logout when no refresh token', async () => {
      useAuthStore.setState({ refreshToken: null });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow(
        'No refresh token available',
      );
    });

    it('calls logout and rethrows on failed refresh response', async () => {
      useAuthStore.setState({ refreshToken: REFRESH_TOKEN });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ success: false, message: 'Token expired' }),
        })
        .mockResolvedValueOnce({ ok: true }); // logout call

      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── setLoading() ───────────────────────────────────────────────────────────
  describe('setLoading()', () => {
    it('sets isLoading to false', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading to true', () => {
      useAuthStore.setState({ isLoading: false });
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });
});
