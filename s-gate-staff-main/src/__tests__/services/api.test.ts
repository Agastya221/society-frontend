import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { useAuth } from '../../store/auth';

const store = (SecureStore as any).__store as Map<string, string>;
// axios keeps its interceptors in `handlers`; the tests call them directly instead of making real requests
const requestHandler = (api.interceptors.request as any).handlers[0].fulfilled as (c: any) => Promise<any>;
const responseFailed = (api.interceptors.response as any).handlers[0].rejected as (e: any) => Promise<any>;

describe('staff api layer', () => {
  beforeEach(() => {
    store.clear();
    useAuth.setState({ ready: true, token: null, staff: null });
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  it('adds the saved access token to every request', async () => {
    store.set('staff_access_token', 'tok-123');
    const config = await requestHandler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer tok-123');
  });

  it('sends no Authorization header before sign-in', async () => {
    const config = await requestHandler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('passes ordinary errors straight through', async () => {
    const error = { response: { status: 500 }, config: { url: '/staff-app/bookings', headers: {} } };
    await expect(responseFailed(error)).rejects.toBe(error);
  });

  it('never tries to refresh a failed login call', async () => {
    const error = { response: { status: 401 }, config: { url: '/staff-app/auth/verify', headers: {} } };
    await expect(responseFailed(error)).rejects.toBe(error);
  });

  it('signs the staff member out when a 401 cannot be refreshed (no refresh token saved)', async () => {
    await useAuth.getState().signIn('dead', 'refresh', { id: 's1' } as any);
    store.delete('staff_refresh_token');
    const error = { response: { status: 401 }, config: { url: '/staff-app/bookings', headers: {} } };
    await expect(responseFailed(error)).rejects.toBe(error);
    expect(useAuth.getState().token).toBeNull();
  });
});
