import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TealButton } from '../components/Buttons';
import { BrandMark } from '../components/BrandMark';
import { FilterChip } from '../components/FilterChip';
import { TextField } from '../components/TextField';
import { api } from '../api/client';
import { reportStore } from '../data/reportStore';
import { sessionStore, type Session } from '../data/sessionStore';
import { AuthBackdrop, useAuthTopInset } from '../layout/AuthBackdrop';
import { AuthCard } from '../layout/AuthCard';
import { useBreakpoint } from '../layout/useBreakpoint';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

type Portal = 'admin' | 'team';

export function AdminLoginScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const topInset = useAuthTopInset();
  const [portal, setPortal] = useState<Portal>('admin');
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
      if (portal === 'admin' && session.role !== 'admin') {
        setErrors({
          password:
            session.role === 'team'
              ? 'This account is a field team. Switch to Field Team to sign in.'
              : 'Citizen accounts use the main Get Started login, not this portal.',
        });
        return;
      }
      if (portal === 'team' && session.role !== 'team') {
        setErrors({
          password:
            session.role === 'admin'
              ? 'This account is an admin. Switch to Admin to sign in.'
              : 'Citizen accounts use the main Get Started login, not this portal.',
        });
        return;
      }
      sessionStore.signIn(session);
      void reportStore.refresh().catch(() => undefined);
      navigation.replace(session.role === 'team' ? 'TeamTabs' : 'AdminTabs');
    } catch (error) {
      setErrors({ password: error instanceof Error ? error.message : 'Could not sign in' });
    } finally {
      setLoading(false);
    }
  };

  const choosePortal = (next: Portal) => {
    setPortal(next);
    setErrors({});
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
          <AuthCard>
            {!isWide ? (
              <View style={styles.lockup}>
                <BrandMark height={92} />
                <Text style={styles.brandName}>Scan</Text>
              </View>
            ) : null}
            <View style={styles.iconWrap}>
              <MaterialIcons
                name={portal === 'admin' ? 'account-balance' : 'engineering'}
                size={28}
                color={colors.teal}
              />
            </View>
            <Text style={styles.title}>{portal === 'admin' ? 'Municipal Authority' : 'Field Team'}</Text>
            <Text style={styles.subtitle}>
              {portal === 'admin'
                ? 'Sign in to review citizen reports and assign field teams.'
                : 'Sign in to accept repairs, mark them complete, or escalate.'}
            </Text>
            <View style={styles.switchRow}>
              <FilterChip label="Admin" selected={portal === 'admin'} onPress={() => choosePortal('admin')} />
              <FilterChip
                label="Field Team"
                selected={portal === 'team'}
                onPress={() => choosePortal('team')}
              />
            </View>
            <Text style={styles.demoHint}>
              {portal === 'admin'
                ? 'Demo admin: admin@rahscan.local / Admin1234!'
                : 'Demo field team: road@rahscan.local / Team1234!'}
            </Text>
            <View style={styles.form}>
              <TextField
                label="Work email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                icon="briefcase-outline"
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
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <TealButton title="Enter portal" onPress={submit} loading={loading} />
            </View>
          </AuthCard>
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
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 28,
  },
  brandName: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  demoHint: {
    marginTop: 8,
    color: colors.tealSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  form: {
    marginTop: 32,
  },
});
