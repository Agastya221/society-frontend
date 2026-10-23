// Backend base URL (no /api/v1 — guard call sites include the prefix).
// Local device QA can point at a backend on the host via `adb reverse`.
// Lives here (not in services/api.ts) so useAuthStore can use it without an
// api.ts <-> useAuthStore require cycle; api.ts re-exports it.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://society-gate-backend-gsrq.onrender.com';
