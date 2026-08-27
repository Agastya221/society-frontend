import { StyleSheet, View, ViewProps } from 'react-native';
import { SgateLayout, SgateSurfaces } from '@/constants/Sgate-theme';

interface CardProps extends ViewProps {
  className?: string; // Allow overriding/adding classes
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <View 
      className={className}
      style={[styles.card, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...SgateSurfaces.card,
    padding: SgateLayout.compactGutter,
  },
});
