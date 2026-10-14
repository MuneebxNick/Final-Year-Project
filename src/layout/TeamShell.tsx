import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';

import type { RootStackParamList, TeamTabParamList } from '../navigation';
import { reportStore } from '../data/reportStore';
import { sessionStore, useSession } from '../data/sessionStore';
import { assignedTeamLabels, isTeamKey } from '../models/report';
import { colors } from '../theme';
import { AppSidebar, teamSidebarItems } from './AppSidebar';
import { useBreakpoint } from './useBreakpoint';
import { webCursor, type WebPressableState } from './webStyles';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  activeKey?: keyof TeamTabParamList;
  children: ReactNode;
};

export function TeamShell({ navigation, activeKey = 'Queue', children }: Props) {
  const { isWide } = useBreakpoint();
  const session = useSession();
  const teamLabel = isTeamKey(session?.team) ? assignedTeamLabels[session.team] : 'Field team';

  if (!isWide) return <>{children}</>;

  return (
    <View style={styles.row}>
      <AppSidebar
        title="Scan"
        subtitle={teamLabel}
        items={teamSidebarItems}
        activeKey={activeKey}
        onNavigate={(key) =>
          navigation.navigate('TeamTabs', { screen: key as keyof TeamTabParamList })
        }
        footer={
          <Pressable
            onPress={() => {
              sessionStore.signOut();
              reportStore.clear();
              navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
            }}
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
