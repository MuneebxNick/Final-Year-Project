import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';

import type { AdminTabParamList, RootStackParamList } from '../navigation';
import { colors } from '../theme';
import { AppSidebar, adminSidebarItems } from './AppSidebar';
import { useBreakpoint } from './useBreakpoint';
import { webCursor, type WebPressableState } from './webStyles';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  activeKey?: keyof AdminTabParamList;
  children: ReactNode;
};

export function AdminShell({ navigation, activeKey = 'Reports', children }: Props) {
  const { isWide } = useBreakpoint();

  if (!isWide) return <>{children}</>;

  return (
    <View style={styles.row}>
      <AppSidebar
        title="RahScan"
        subtitle="Municipal portal"
        items={adminSidebarItems}
        activeKey={activeKey}
        onNavigate={(key) =>
          navigation.navigate('AdminTabs', { screen: key as keyof AdminTabParamList })
        }
        footer={
          <Pressable
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
            style={(state: WebPressableState) => [
              styles.signOut,
              webCursor,
              state.hovered && styles.signOutHover,
            ]}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        }
      />
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.cream,
  },
  main: {
    flex: 1,
  },
  signOut: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutHover: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
});
