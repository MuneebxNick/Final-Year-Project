import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '../components/BrandMark';
import { colors, shadows } from '../theme';
import { useBreakpoint } from './useBreakpoint';

type Props = {
  children: ReactNode;
  headline: string;
  accentBefore: string;
  accent: string;
  subtitle: string;
};

export function AuthSplit({ children, headline, accentBefore, accent, subtitle }: Props) {
  const { isWide, width } = useBreakpoint();
  const spacious = width >= 1180;

  if (!isWide) {
    return (
      <View style={styles.narrow}>
        <View style={styles.narrowLockup}>
          <BrandMark height={92} />
          <Text style={styles.brandName}>Scan</Text>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.page, spacious && styles.pageSpacious]}>
      <View style={[styles.row, spacious && styles.rowSpacious]}>
        <View style={[styles.hero, spacious && styles.heroSpacious]}>
          <View style={styles.brand}>
            <BrandMark height={78} style={styles.mark} />
            <View>
              <Text style={styles.brandName}>Scan</Text>
              <Text style={styles.brandTag}>Safer Roads, Stronger Cities</Text>
            </View>
          </View>
          <Text style={[styles.headline, spacious && styles.headlineSpacious]}>{headline}</Text>
          <Text style={[styles.headline, spacious && styles.headlineSpacious]}>
            {accentBefore}
            <Text style={styles.accent}>{accent}</Text>
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.card, spacious && styles.cardSpacious, shadows.card]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  narrow: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  narrowLockup: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 28,
  },
  page: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 96,
    paddingHorizontal: 32,
  },
  pageSpacious: {
    paddingHorizontal: 64,
    paddingBottom: 120,
  },
  row: {
    width: '100%',
    maxWidth: 980,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 40,
  },
  rowSpacious: {
    maxWidth: 1080,
    gap: 72,
  },
  hero: {
    flex: 1,
    maxWidth: 420,
    paddingTop: 4,
  },
  heroSpacious: {
    maxWidth: 480,
    paddingTop: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  mark: {
    marginRight: 12,
  },
  brandName: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTag: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  headline: {
    color: colors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headlineSpacious: {
    fontSize: 44,
    lineHeight: 52,
  },
  accent: {
    color: colors.blueMid,
  },
  subtitle: {
    marginTop: 18,
    maxWidth: 380,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    width: 420,
    flexShrink: 0,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  cardSpacious: {
    width: 460,
    paddingHorizontal: 36,
    paddingVertical: 40,
  },
});
