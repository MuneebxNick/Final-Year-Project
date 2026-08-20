import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { webCursor, webNoOutline, type WebPressableState } from '../layout/webStyles';
import { useBreakpoint } from '../layout/useBreakpoint';
import { colors, radii, shadows } from '../theme';

type ButtonProps = PressableProps & {
  title: string;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
};

function useButtonChrome() {
  const { isWide } = useBreakpoint();
  return [webCursor, webNoOutline, isWide && styles.wide] as const;
}

export function PrimaryButton({ title, style, loading, disabled, ...rest }: ButtonProps) {
  const chrome = useButtonChrome();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state: WebPressableState) => [
        styles.base,
        styles.primary,
        ...chrome,
        state.hovered && styles.primaryHover,
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryLabel}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TealButton({ title, style, loading, disabled, ...rest }: ButtonProps) {
  const chrome = useButtonChrome();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state: WebPressableState) => [
        styles.base,
        styles.teal,
        ...chrome,
        state.hovered && styles.tealHover,
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.tealLabel}>{title}</Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({ title, style, disabled, ...rest }: ButtonProps) {
  const chrome = useButtonChrome();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state: WebPressableState) => [
        styles.base,
        styles.outline,
        ...chrome,
        state.hovered && styles.outlineHover,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={styles.outlineLabel}>{title}</Text>
    </Pressable>
  );
}

export function GhostOutlineButton({ title, style, disabled, ...rest }: ButtonProps) {
  const chrome = useButtonChrome();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state: WebPressableState) => [
        styles.base,
        styles.ghostOutline,
        ...chrome,
        state.hovered && styles.ghostHover,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={styles.ghostLabel}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  wide: {
    minHeight: 52,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.blueMid,
    ...shadows.button,
  },
  primaryHover: {
    backgroundColor: '#12D4C4',
  },
  teal: {
    backgroundColor: colors.teal,
  },
  tealHover: {
    backgroundColor: colors.tealMid,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  outlineHover: {
    backgroundColor: colors.tealLight,
    borderColor: colors.tealMid,
  },
  ghostOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  ghostHover: {
    backgroundColor: colors.tealLight,
  },
  pressed: {
    opacity: Platform.OS === 'web' ? 0.94 : 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tealLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  outlineLabel: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '600',
  },
  ghostLabel: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '600',
  },
});
