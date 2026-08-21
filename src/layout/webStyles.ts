import { Platform, type ViewStyle } from 'react-native';

import { colors } from '../theme';

export const webCursor: ViewStyle =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

export const webNoOutline: ViewStyle =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
      } as unknown as ViewStyle)
    : {};

const autofillFill = `0 0 0 1000px ${colors.white} inset`;

export const webInputNoOutline: ViewStyle =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        backgroundColor: 'transparent',
        boxShadow: autofillFill,
        WebkitBoxShadow: autofillFill,
        WebkitTextFillColor: colors.ink,
        caretColor: colors.ink,
        transition: 'background-color 5000s ease-in-out 0s, box-shadow 0s',
      } as unknown as ViewStyle)
    : {};

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rahscan-webkit-autofill';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input::placeholder, textarea::placeholder {
        -webkit-text-fill-color: #9AA6A4;
      }
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active,
      textarea:-webkit-autofill {
        -webkit-box-shadow: ${autofillFill} !important;
        -webkit-text-fill-color: ${colors.ink} !important;
        caret-color: ${colors.ink};
        transition: background-color 5000s ease-in-out 0s, box-shadow 0s;
      }
    `;
    document.head.appendChild(style);
  }
}

export type WebPressableState = {
  pressed: boolean;
  hovered?: boolean;
};

