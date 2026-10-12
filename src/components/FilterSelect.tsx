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

export type FilterSelectSection = {
  section: string;
};

export type FilterSelectItem<T extends string> = FilterSelectOption<T> | FilterSelectSection;

function isSection<T extends string>(item: FilterSelectItem<T>): item is FilterSelectSection {
  return 'section' in item;
}

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly FilterSelectItem<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
  disabled = false,
}: Props<T>) {
  const anchorRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [menu, setMenu] = useState({ x: 0, y: 0, width: 150 });

  const selectedLabel =
    options.find(
      (item): item is FilterSelectOption<T> => !isSection(item) && item.value === value,
    )?.label ?? '';
  const menuCap = options.some(isSection) ? 440 : 280;

  const toggle = () => {
    if (disabled) return;
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
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open && !disabled, disabled }}
        style={(state: WebPressableState) => [
          styles.control,
          !disabled && webCursor,
          open && !disabled && styles.controlOpen,
          !disabled && state.hovered && styles.controlHover,
          disabled && styles.controlDisabled,
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

      <Modal visible={open && !disabled} transparent animationType="none" onRequestClose={close}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" />
          <View
            style={[
              styles.menu,
              {
                top: menu.y,
                left: menu.x,
                width: Math.max(menu.width, 150),
                maxHeight: Math.min(menuCap, Math.max(120, windowHeight - menu.y - 16)),
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {options.map((item) => {
                if (isSection(item)) {
                  return (
                    <View key={`section-${item.section}`} accessibilityRole="header" style={styles.section}>
                      <Text style={styles.sectionLabel}>{item.section}</Text>
                    </View>
                  );
                }
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
  controlDisabled: {
    opacity: 0.5,
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
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
