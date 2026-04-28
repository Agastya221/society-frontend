import React from 'react';
import SharedHomeScreen from '@/components/home/SharedHomeScreen';

// ─── Resident Home ────────────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedHomeScreen with role-based rendering.

export default function ResidentHomeScreen() {
    return <SharedHomeScreen role="resident" />;
}
