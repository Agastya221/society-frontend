import React from 'react';
import SharedStaffScreen from '@/components/staff/SharedStaffScreen';

// Opened from More Tools (not one of the admin's visible tabs), so it keeps its back button.
export default function AdminStaffScreen() {
    return <SharedStaffScreen />;
}
