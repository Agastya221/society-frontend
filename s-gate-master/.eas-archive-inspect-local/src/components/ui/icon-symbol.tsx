import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export function IconSymbol({
    name,
    size = 24,
    color,
    style,
}: {
    name: keyof typeof MAPPING;
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
    weight?: SymbolViewProps['weight'];
}) {
    const mapped = MAPPING[name];
    if (!mapped) return null;
    return (
        <MaterialIcons
            color={color}
            size={size}
            name={mapped}
            style={style as any}
        />
    );
}

const MAPPING = {
    'house.fill': 'home',
    'paperplane.fill': 'send',
    'chevron.left.forwardslash.chevron.right': 'code',
    'chevron.right': 'chevron-right',
} as const satisfies Partial<
    Record<string, React.ComponentProps<typeof MaterialIcons>['name']>
>;
