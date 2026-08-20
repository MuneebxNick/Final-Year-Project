import { useWindowDimensions } from 'react-native';

export const WIDE_BREAKPOINT = 900;
export const SIDEBAR_WIDTH = 248;
export const CONTENT_MAX_WIDTH = 1080;

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= WIDE_BREAKPOINT,
  };
}
