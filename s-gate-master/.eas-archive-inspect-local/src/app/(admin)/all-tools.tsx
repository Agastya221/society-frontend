import React from 'react';
import SharedToolsScreen from '@/components/tools/SharedToolsScreen';

// ─── Admin All Tools ──────────────────────────────────────────────────────────
// Thin wrapper — all UI lives in SharedToolsScreen with role-based rendering.

export default function AdminAllToolsScreen() {
    return <SharedToolsScreen role="admin" />;
}
