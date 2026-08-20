import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { AdminReportDetailScreen } from './src/screens/AdminReportDetailScreen';
import { AdminTabs } from './src/screens/AdminTabs';
import { DetectionResultScreen } from './src/screens/DetectionResultScreen';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { UserReportDetailScreen } from './src/screens/UserReportDetailScreen';
import { UserTabs } from './src/screens/UserTabs';
import type { RootStackParamList } from './src/navigation';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{
              headerShadowVisible: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen
              name="Landing"
              component={LandingScreen}
              options={{ headerShown: false, statusBarStyle: 'dark' }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                title: '',
                headerTintColor: colors.teal,
                headerStyle: { backgroundColor: colors.cream },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'dark',
              }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                title: '',
                headerTintColor: colors.teal,
                headerStyle: { backgroundColor: colors.cream },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'dark',
              }}
            />
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
            <Stack.Screen
              name="AdminLogin"
              component={AdminLoginScreen}
              options={{
                title: '',
                headerTintColor: colors.teal,
                headerStyle: { backgroundColor: colors.cream },
                contentStyle: { backgroundColor: colors.cream },
                statusBarStyle: 'dark',
              }}
            />
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
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
