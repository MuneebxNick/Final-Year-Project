import { Platform, type ViewStyle } from 'react-native';

export const webCursor: ViewStyle =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

export const webNoOutline: ViewStyle =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none' } as unknown as ViewStyle)
    : {};

export type WebPressableState = {
  pressed: boolean;
  hovered?: boolean;
};

