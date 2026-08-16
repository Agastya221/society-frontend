import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { CreateGatePassForm } from '../../../components/gate-pass/CreateGatePassForm';

export default function AdminCreateGatePassScreen() {
    const router = useRouter();

    const handleSuccess = () => {
        // Navigate back to admin gate passes list
        router.push('/(admin)/gate-passes');
    };

    return (
        <>
            <Stack.Screen options={{ 
                title: 'Create Gate Pass',
                headerBackTitle: 'Back',
                headerShown: true,
            }} />
            
            <CreateGatePassForm role="ADMIN" onSuccess={handleSuccess} />
        </>
    );
}
