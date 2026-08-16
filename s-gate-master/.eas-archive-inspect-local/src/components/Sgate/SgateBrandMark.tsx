'use no memo';
import React from 'react';
import { Image, View } from 'react-native';

interface SgateBrandMarkProps {
    size?: number;
}

export function SgateBrandMark({ size = 42 }: SgateBrandMarkProps) {
    return (
        <View style={{ width: size, height: size }}>
            <Image
                source={require('../../../assets/images/icons/s-gate-logo-without-bg.png')}
                style={{ width: size, height: size, resizeMode: 'contain' }}
            />
        </View>
    );
}
