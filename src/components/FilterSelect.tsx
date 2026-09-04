import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { webCursor, type WebPressableState } from '../layout/webStyles';
import { colors, radii, shadows } from '../theme';

export type FilterSelectOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: FilterSelectOption<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: Props<T>) {
  const anchorRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [menu, setMenu] = useState({ x: 0, y: 0, width: 150 });

  const selectedLabel = options.find((item) => item.value === value)?.label ?? '';

  const toggle = () => {
    if (open) {
      onOpenChange(false);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenu({ x, y: y + height + 4, width });
      onOpenChange(true);
    });
  };

  const close = () => onOpenChange(false);

  return (
    <View ref={anchorRef} collapsable={false} style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={(state: WebPressableState) => [
          styles.control,
          webCursor,
          open && styles.controlOpen,
          state.hovered && styles.controlHover,
        ]}
      >
        <View style={styles.texts}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {selectedLabel}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" />
          <View
            style={[
              styles.menu,
              {
                top: menu.y,
                left: menu.x,
                width: Math.max(menu.width, 150),
                maxHeight: Math.min(280, Math.max(120, windowHeight - menu.y - 16)),
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {options.map((item) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    accessibilityRole="button"
                    style={(state: WebPressableState) => [
                      styles.option,
                      webCursor,
                      selected && styles.optionOn,
                      state.hovered && styles.optionHover,
                    ]}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 150,
  },
  control: {
    minHeight: 56,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlHover: {
    borderColor: colors.blueMid,
  },
  controlOpen: {
    borderColor: colors.blueMid,
    borderWidth: 1.4,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionHover: {
    backgroundColor: colors.cream,
  },
  optionOn: {
    backgroundColor: colors.blueSoft,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  optionLabelOn: {
    color: colors.blue,
  },
});
