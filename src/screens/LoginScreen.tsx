import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/Buttons';
import { TextField } from '../components/TextField';
import { api } from '../api/client';
import { reportStore } from '../data/reportStore';
import { sessionStore, type Session } from '../data/sessionStore';
import { AuthBackdrop, useAuthTopInset } from '../layout/AuthBackdrop';
import { AuthSplit } from '../layout/AuthSplit';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor } from '../layout/webStyles';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const topInset = useAuthTopInset();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = 'Enter your email';
    else if (!trimmed.includes('@') || !trimmed.includes('.')) next.email = 'Enter a valid email';
    if (!password) next.password = 'Enter your password';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    try {
      const session = await api<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed, password }),
      });
      if (session.role !== 'citizen') {
        setErrors({
          password: 'Admin accounts use the Municipal Authority login on the home screen.',
        });
        return;
      }
      sessionStore.signIn(session);
      void reportStore.refresh().catch(() => undefined);
      navigation.replace('UserTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign in';
      setErrors({
        password:
          message === 'Invalid email or password'
            ? 'Invalid email or password. Use demo@rahscan.local / Demo1234! or the account you signed up with.'
            : message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }, isWide && styles.contentWide]}
          keyboardShouldPersistTaps="handled"
        >
          <AuthSplit
            headline="Welcome back!"
            accentBefore="Let's "
            accent="make roads safer."
            subtitle="Sign in to report potholes, track updates, and help improve your city."
          >
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your RahScan account.</Text>
            <Text style={styles.demoHint}>Demo citizen: demo@rahscan.local / Demo1234!</Text>
            <View style={styles.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                icon="lock-closed-outline"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <PrimaryButton title="Continue" onPress={submit} loading={loading} />
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>New to RahScan?</Text>
              <Pressable
                onPress={() => navigation.replace('Signup')}
                hitSlop={8}
                style={webCursor}
              >
                <Text style={styles.link}> Sign up</Text>
              </Pressable>
            </View>
          </AuthSplit>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 168,
    width: '100%',
  },
  contentWide: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  demoHint: {
    marginTop: 16,
    backgroundColor: colors.tealLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.tealMid,
    fontSize: 13,
    lineHeight: 18,
    overflow: 'hidden',
  },
  form: {
    marginTop: 32,
  },
  row: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    color: colors.muted,
  },
  link: {
    color: colors.teal,
    fontWeight: '700',
  },
});
