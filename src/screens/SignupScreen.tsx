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
import { AuthCard } from '../layout/AuthCard';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor } from '../layout/webStyles';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name';
    const trimmed = email.trim();
    if (!trimmed) next.email = 'Enter your email';
    else if (!trimmed.includes('@') || !trimmed.includes('.')) next.email = 'Enter a valid email';
    if (!password) next.password = 'Create a password';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!confirm) next.confirm = 'Confirm your password';
    else if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    try {
      const session = await api<Session>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: trimmed, password }),
      });
      sessionStore.signIn(session);
      void reportStore.refresh().catch(() => undefined);
      navigation.replace('UserTabs');
    } catch (error) {
      setErrors({ email: error instanceof Error ? error.message : 'Could not create account' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join RahScan to submit road-condition reports.</Text>
        <View style={styles.form}>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            error={errors.name}
            icon="person-outline"
            autoCapitalize="words"
            autoCorrect
            returnKeyType="next"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            icon="lock-closed-outline"
            secureTextEntry
            returnKeyType="next"
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            icon="lock-closed-outline"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <PrimaryButton title="Create account" onPress={submit} loading={loading} />
        </View>
        <View style={styles.row}>
          <Text style={styles.muted}>Already have an account?</Text>
          <Pressable
            onPress={() => navigation.replace('Login')}
            hitSlop={8}
            style={webCursor}
          >
            <Text style={styles.link}> Login</Text>
          </Pressable>
        </View>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  contentWide: {
    paddingHorizontal: 0,
    paddingTop: 0,
    justifyContent: 'center',
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
