import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SFSymbol, SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and requires manual mapping to MaterialIcons.
 */
export function IconSymbol({
    name,
    size = 24,
    color,
    style,
}: {
    name: SFSymbol;
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<ViewStyle>;
    weight?: SymbolViewProps['weight'];
}) {
    return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

// Private Mappings
// Update this type union as you add more mappings
const MAPPING: Record<SFSymbol, React.ComponentProps<typeof MaterialIcons>['name']> = {
    // See MaterialIcons here: https://icons.expo.fyi
    // See SF Symbols in the SF Symbols app on Mac.
    'house.fill': 'home',
    'paperplane.fill': 'send',
    'chevron.left.forwardslash.chevron.right': 'code',
    'chevron.right': 'chevron-right',
} as Partial<
    Record<
        import('expo-symbols').SFSymbol,
        React.ComponentProps<typeof MaterialIcons>['name']
    >
>;
