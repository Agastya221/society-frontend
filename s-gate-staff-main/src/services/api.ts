import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../store/auth';

export const API_URL = 'https://society-gate-backend-gsrq.onrender.com/api/v1';
export const api = create({ baseURL: API_URL, timeout: 60000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('staff_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const request = error.config;
  if (error.response?.status !== 401 || request?._retry || request?.url?.includes('/auth/')) throw error;
  request._retry = true;
  refreshing ??= (async () => {
    const refreshToken = await SecureStore.getItemAsync('staff_refresh_token');
    if (!refreshToken) throw error;
    const response = await create({ baseURL: API_URL }).post('/staff-app/auth/refresh', { refreshToken });
    const data = response.data.data;
    await Promise.all([
      SecureStore.setItemAsync('staff_access_token', data.accessToken),
      SecureStore.setItemAsync('staff_refresh_token', data.refreshToken),
      SecureStore.setItemAsync('staff_profile', JSON.stringify(data.staff)),
    ]);
    useAuth.setState({ token: data.accessToken, staff: data.staff });
    return data.accessToken as string;
  })().finally(() => { refreshing = null; });
  let accessToken: string;
  try {
    accessToken = await refreshing;
  } catch (refreshError: any) {
    // Refresh token missing/expired/revoked: without this the app kept a dead token,
    // stayed on the home screen and every screen failed silently. Sign out so the
    // root layout routes back to /login — but not on a plain network failure.
    const status = refreshError?.response?.status;
    if (refreshError === error || status === 401 || status === 403) await useAuth.getState().signOut();
    throw refreshError;
  }
  request.headers.Authorization = `Bearer ${accessToken}`;
  return api(request);
});
