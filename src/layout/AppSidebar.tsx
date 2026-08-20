import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import { SIDEBAR_WIDTH } from './useBreakpoint';
import { webCursor, type WebPressableState } from './webStyles';

export type SidebarItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: SidebarItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  footer?: ReactNode;
};

export function AppSidebar({
  title = 'RahScan',
  subtitle = 'Citizen portal',
  items,
  activeKey,
  onNavigate,
  footer,
}: Props) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Ionicons name="warning-outline" size={18} color={colors.white} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.nav}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => onNavigate(item.key)}
              style={(state: WebPressableState) => [
                styles.item,
                webCursor,
                active && styles.itemActive,
                state.hovered && !active && styles.itemHover,
                state.pressed && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? colors.white : 'rgba(255,255,255,0.72)'}
              />
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

export const citizenSidebarItems: SidebarItem[] = [
  { key: 'Home', label: 'Home', icon: 'home-outline' },
  { key: 'Report', label: 'Report', icon: 'camera-outline' },
  { key: 'MyReports', label: 'My Reports', icon: 'list-outline' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline' },
];

export const adminSidebarItems: SidebarItem[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'Reports', label: 'Reports', icon: 'clipboard-outline' },
  { key: 'Map', label: 'Map', icon: 'map-outline' },
  { key: 'Predictive', label: 'Predictive', icon: 'pulse-outline' },
];

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.teal,
    paddingTop: 28,
    paddingHorizontal: 14,
    paddingBottom: 20,
    justifyContent: 'flex-start',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  nav: {
    gap: 6,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: 'rgba(0, 196, 180, 0.22)',
  },
  itemHover: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  itemPressed: {
    opacity: 0.88,
  },
  itemLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
    fontSize: 14,
  },
  itemLabelActive: {
    color: colors.white,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
});
