import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageStyle } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

import { useBreakpoint } from './useBreakpoint';

const skyline = require('../../assets/signup-skyline.jpg');

export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Image
        source={skyline}
        resizeMode="cover"
        accessible={false}
        style={styles.image as ImageStyle}
      />
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

/** Space for the transparent stack header on phone layouts. Wide layouts clear it with their own padding. */
export function useAuthTopInset() {
  const headerHeight = useHeaderHeight();
  const { isWide } = useBreakpoint();
  return isWide ? 0 : headerHeight;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F8F6',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    objectFit: 'cover',
    objectPosition: 'center bottom',
  } as ImageStyle,
  foreground: {
    flex: 1,
    zIndex: 1,
  },
});
