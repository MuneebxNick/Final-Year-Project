import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, shadows } from '../theme';
import { useBreakpoint } from './useBreakpoint';

export function AuthCard({ children }: { children: ReactNode }) {
  const { isWide } = useBreakpoint();
  if (!isWide) return <View>{children}</View>;
  return (
    <View style={styles.page}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  card: {
    width: 440,
    maxWidth: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 36,
    paddingVertical: 36,
    ...shadows.card,
  },
});
