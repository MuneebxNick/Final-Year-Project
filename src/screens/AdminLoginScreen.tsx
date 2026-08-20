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
import { TextField } from '../components/TextField';
import { AuthCard } from '../layout/AuthCard';
import { useBreakpoint } from '../layout/useBreakpoint';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

export function AdminLoginScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = 'Enter your email';
    else if (!trimmed.includes('@') || !trimmed.includes('.')) next.email = 'Enter a valid email';
    if (!password) next.password = 'Enter your password';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    navigation.replace('AdminTabs');
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
        <View style={styles.iconWrap}>
          <MaterialIcons name="account-balance" size={28} color={colors.teal} />
        </View>
        <Text style={styles.title}>Municipal Authority</Text>
        <Text style={styles.subtitle}>
          Sign in to review citizen reports and assign field teams.
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
          <TealButton title="Enter portal" onPress={submit} />
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
  form: {
    marginTop: 32,
  },
});
