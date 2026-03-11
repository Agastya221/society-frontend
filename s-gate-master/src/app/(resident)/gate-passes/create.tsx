import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { CreateGatePassForm } from '../../../components/gate-pass/CreateGatePassForm';

export default function CreateGatePassScreen() {
    const router = useRouter();

    const handleSuccess = () => {
        // Navigate back to gate passes list
        router.back();
    };

    return (
        <>
            <Stack.Screen options={{ 
                title: 'Create Gate Pass',
                headerBackTitle: 'Back'
            }} />
            
            <CreateGatePassForm role="RESIDENT" onSuccess={handleSuccess} />
        </>
    );
}
