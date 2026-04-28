import React from 'react';
import SharedHomeScreen from '@/components/home/SharedHomeScreen';

// ─── Admin Home ───────────────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedHomeScreen with role-based rendering.

export default function AdminHomeScreen() {
    return <SharedHomeScreen role="admin" />;
}
