import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../store/auth';

const staff = { id: 's1', name: 'Sunita Devi', phone: '9000000001' } as any;
const store = (SecureStore as any).__store as Map<string, string>;

describe('staff auth store', () => {
  beforeEach(() => {
    store.clear();
    useAuth.setState({ ready: false, token: null, staff: null });
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  it('starts signed out and not ready', () => {
    expect(useAuth.getState()).toMatchObject({ ready: false, token: null, staff: null });
  });

  it('signs in: keeps the tokens and profile on the phone and in memory', async () => {
    await useAuth.getState().signIn('access-1', 'refresh-1', staff);
    expect(useAuth.getState().token).toBe('access-1');
    expect(useAuth.getState().staff?.name).toBe('Sunita Devi');
    expect(store.get('staff_access_token')).toBe('access-1');
    expect(store.get('staff_refresh_token')).toBe('refresh-1');
    expect(JSON.parse(store.get('staff_profile')!).id).toBe('s1');
  });

  it('hydrates a saved session when the app starts', async () => {
    store.set('staff_access_token', 'saved');
    store.set('staff_profile', JSON.stringify(staff));
    await useAuth.getState().hydrate();
    expect(useAuth.getState()).toMatchObject({ ready: true, token: 'saved' });
    expect(useAuth.getState().staff?.id).toBe('s1');
  });

  it('hydrates to signed out, but ready, when nothing is saved', async () => {
    await useAuth.getState().hydrate();
    expect(useAuth.getState()).toMatchObject({ ready: true, token: null, staff: null });
  });

  it('signs out: clears the phone and memory, and tells the server so pushes stop', async () => {
    await useAuth.getState().signIn('access-1', 'refresh-1', staff);
    await useAuth.getState().signOut();
    expect(useAuth.getState().token).toBeNull();
    expect(store.size).toBe(0);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('/staff-app/auth/logout');
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-1' });
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('signs out locally even when the server cannot be reached', async () => {
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('offline')));
    await useAuth.getState().signIn('access-1', 'refresh-1', staff);
    await expect(useAuth.getState().signOut()).resolves.toBeUndefined();
    expect(useAuth.getState().token).toBeNull();
  });
});
