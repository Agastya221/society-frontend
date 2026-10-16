// Prints short-lived (30 min) access tokens for the demo accounts the two-person flows act as:
// the resident of A101 and the guard, both in the Dalma Heights demo society. Signed with the backend's
// own secret, read from its .env on this computer (SGATE_BACKEND_DIR, default E:/society-gate-backend).
// Output: RESIDENT_TOKEN=... and GUARD_TOKEN=... lines; nothing at all when the backend is not here.
const path = require('path');
const crypto = require('crypto');

const backend = process.env.SGATE_BACKEND_DIR || 'E:/society-gate-backend';
const need = (name) => require(path.join(backend, 'node_modules', name));
try {
  need('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
} catch {
  process.exit(0);
}
const jwt = need('jsonwebtoken');
if (!process.env.JWT_SECRET) process.exit(0);

const SOCIETY = 'edfccafb-62ab-4331-a423-eb4054261508';
const sign = (claims) => jwt.sign(
  { ...claims, societyId: SOCIETY, type: 'access', jti: crypto.randomUUID() },
  process.env.JWT_SECRET,
  { expiresIn: '30m', audience: 'sgate-user', algorithm: 'HS256' },
);

console.log('RESIDENT_TOKEN=' + sign({
  userId: '79120472-69bc-4443-8c65-f04ddda9618f', role: 'RESIDENT', flatId: '5352aea1-5237-44cb-9dad-76fbd4406af4', appType: 'RESIDENT_APP',
}));
console.log('GUARD_TOKEN=' + sign({
  userId: 'db155cb5-646c-4f07-8f6e-77042ea231c3', role: 'GUARD', flatId: null, appType: 'GUARD_APP',
}));
