import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';
import { CONTENT_MAX_WIDTH, useBreakpoint } from './useBreakpoint';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenContainer({ children, style }: Props) {
  const { isWide } = useBreakpoint();
  return (
    <View style={[styles.base, isWide && styles.wide, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  wide: {
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 48,
    backgroundColor: colors.cream,
  },
});
