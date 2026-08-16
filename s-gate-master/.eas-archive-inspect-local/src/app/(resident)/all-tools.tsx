import React from 'react';
import SharedToolsScreen from '@/components/tools/SharedToolsScreen';

// ─── Resident All Tools ───────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedToolsScreen with role-based rendering.

export default function ResidentAllToolsScreen() {
    return <SharedToolsScreen role="resident" />;
}
