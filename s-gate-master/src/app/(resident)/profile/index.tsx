import React from 'react';
import SharedProfileScreen from '@/components/profile/SharedProfileScreen';

// ─── Resident Profile ─────────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedProfileScreen with role-based rendering.

export default function ResidentProfileScreen() {
    return <SharedProfileScreen role="resident" />;
}
