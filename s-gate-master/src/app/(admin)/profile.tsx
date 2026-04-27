import React from 'react';
import SharedProfileScreen from '@/components/profile/SharedProfileScreen';

// ─── Admin Profile ────────────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedProfileScreen with role-based rendering.

export default function AdminProfileScreen() {
    return <SharedProfileScreen role="admin" />;
}
