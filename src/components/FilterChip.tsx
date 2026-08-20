import { Pressable, StyleSheet, Text } from 'react-native';

import { webCursor, type WebPressableState } from '../layout/webStyles';
import { colors, radii } from '../theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(state: WebPressableState) => [
        styles.chip,
        webCursor,
        selected && styles.chipOn,
        state.hovered && styles.chipHover,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipHover: {
    borderColor: colors.blueMid,
  },
  chipOn: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blueMid,
  },
  chipLabel: {
    fontWeight: '600',
    color: colors.ink,
    fontSize: 13,
  },
  chipLabelOn: {
    color: colors.blue,
  },
});
