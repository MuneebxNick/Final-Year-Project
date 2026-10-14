import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { reportStore } from './src/data/reportStore';
import { sessionStore } from './src/data/sessionStore';
import { AuthBackdrop } from './src/layout/AuthBackdrop';
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { AdminReportDetailScreen } from './src/screens/AdminReportDetailScreen';
import { AdminTabs } from './src/screens/AdminTabs';
import { DetectionResultScreen } from './src/screens/DetectionResultScreen';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { TeamReportDetailScreen } from './src/screens/TeamReportDetailScreen';
import { TeamTabs } from './src/screens/TeamTabs';
import { UserReportDetailScreen } from './src/screens/UserReportDetailScreen';
import { UserTabs } from './src/screens/UserTabs';
import type { RootStackParamList } from './src/navigation';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const authScreenOptions = {
  title: '',
  headerTransparent: true,
  headerShadowVisible: false,
  headerTintColor: colors.teal,
  headerStyle: { backgroundColor: 'transparent' },
  contentStyle: { backgroundColor: 'transparent' },
  statusBarStyle: 'dark' as const,
};

type BootRoute = 'Landing' | 'UserTabs' | 'AdminTabs' | 'TeamTabs';

function BootSplash() {
  return (
    <View style={styles.boot}>
      <Text style={styles.bootBrand}>Scan</Text>
      <ActivityIndicator color={colors.tealMid} />
    </View>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<BootRoute | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await sessionStore.hydrate();
      if (cancelled) return;
      if (!session?.token) {
        setInitialRoute('Landing');
        return;
      }
      void reportStore.refresh().catch(() => undefined);
      if (session.role === 'admin') setInitialRoute('AdminTabs');
      else if (session.role === 'team') setInitialRoute('TeamTabs');
      else setInitialRoute('UserTabs');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialRoute) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AuthBackdrop>
            <BootSplash />
          </AuthBackdrop>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthBackdrop>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShadowVisible: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen
              name="Landing"
              component={LandingScreen}
              options={{ headerShown: false, statusBarStyle: 'dark' }}
            />
            <Stack.Screen name="Login" component={LoginScreen} options={authScreenOptions} />
            <Stack.Screen name="Signup" component={SignupScreen} options={authScreenOptions} />
            <Stack.Screen
              name="UserTabs"
              component={UserTabs}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="DetectionResult"
              component={DetectionResultScreen}
              options={{
                title: 'Detection result',
                headerTintColor: colors.white,
                headerStyle: { backgroundColor: colors.teal },
                headerTitleStyle: { fontWeight: '600', fontSize: 18 },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'light',
              }}
            />
            <Stack.Screen
              name="UserReportDetail"
              component={UserReportDetailScreen}
              options={{
                title: 'Report detail',
                headerTintColor: colors.white,
                headerStyle: { backgroundColor: colors.teal },
                headerTitleStyle: { fontWeight: '600', fontSize: 18 },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'light',
              }}
            />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={authScreenOptions} />
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabs}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="AdminReportDetail"
              component={AdminReportDetailScreen}
              options={{
                title: 'Report detail',
                headerTintColor: colors.white,
                headerStyle: { backgroundColor: colors.teal },
                headerTitleStyle: { fontWeight: '600', fontSize: 20 },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'light',
              }}
            />
            <Stack.Screen
              name="TeamTabs"
              component={TeamTabs}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="TeamReportDetail"
              component={TeamReportDetailScreen}
              options={{
                title: 'Repair',
                headerTintColor: colors.white,
                headerStyle: { backgroundColor: colors.teal },
                headerTitleStyle: { fontWeight: '600', fontSize: 20 },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'light',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        </AuthBackdrop>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootBrand: {
    color: colors.tealMid,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontSize: 18,
  },
});
