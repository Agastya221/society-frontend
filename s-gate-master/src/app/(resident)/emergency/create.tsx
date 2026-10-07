import React from 'react';
import SharedSOSCreateScreen from '../../../components/emergency/SharedSOSCreateScreen';

import { withResetOnBlur } from '@/components/layout/withResetOnBlur';
function ResidentCreateEmergency() {
    return <SharedSOSCreateScreen role="resident" />;
}

export default withResetOnBlur(ResidentCreateEmergency);
