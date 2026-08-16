import React from 'react';

import SharedHomeScreen from './SharedHomeScreen';
import type { UserRole } from './homeToolsConfig';

interface HomeScreenProps {
    role: UserRole;
}

export function HomeScreen({ role }: HomeScreenProps) {
    return <SharedHomeScreen role={role} />;
}

export default HomeScreen;
