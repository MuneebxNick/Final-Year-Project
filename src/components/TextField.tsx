import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { webInputNoOutline, webNoOutline } from '../layout/webStyles';
import { colors, radii } from '../theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
};

const ICON_BOX = 24;
const LINE = 24;
const BORDER = 1;
const FIELD_MIN = 56;
const AREA_MIN = 96;
// (56 - 24 - 2) / 2. Shared top inset so the icon box and the first line start together.
const INSET = (FIELD_MIN - LINE - BORDER * 2) / 2;
const AREA_INNER = AREA_MIN - INSET * 2 - BORDER * 2;

// Inline so it beats the web TextInput `font` shorthand, which resets line-height,
// and the textarea user-agent padding.
const webInputReset: TextStyle =
  Platform.OS === 'web'
    ? {
        lineHeight: LINE,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      }
    : {};

const webSingleLineCenter: TextStyle =
  Platform.OS === 'web'
    ? {
        height: LINE,
      }
    : {};

export function TextField({
  label,
  value,
  onChangeText,
  error,
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType,
  onSubmitEditing,
  placeholder,
  multiline,
  numberOfLines,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <View style={[styles.iconBox, multiline && styles.iconTop]}>
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.pillRed : focused ? colors.tealMid : colors.muted}
          />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="#9AA6A4"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[
            styles.input,
            multiline ? styles.multiline : styles.singleLine,
            webInputReset,
            !multiline && webSingleLineCenter,
            webInputNoOutline,
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={[styles.iconBox, styles.trailing, multiline && styles.iconTop, webNoOutline]}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  field: {
    minHeight: FIELD_MIN,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: BORDER,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: INSET,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    minHeight: AREA_MIN,
    paddingTop: INSET,
    paddingBottom: INSET,
  },
  fieldFocused: {
    borderColor: colors.blueMid,
    borderWidth: 1.4,
  },
  fieldError: {
    borderColor: colors.pillRed,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  iconTop: {
    alignSelf: 'flex-start',
  },
  trailing: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: LINE,
    color: colors.ink,
    margin: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    includeFontPadding: false,
  },
  singleLine: {
    height: LINE,
    textAlignVertical: 'center',
  },
  multiline: {
    alignSelf: 'stretch',
    minHeight: AREA_INNER,
    lineHeight: LINE,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
  },
  error: {
    marginTop: 6,
    marginLeft: 4,
    color: colors.pillRed,
    fontSize: 13,
    lineHeight: 18,
  },
});
