import { Platform } from 'react-native';

/** This Mac's current LAN address, so a phone on the same network can reach the API. */
const LOCAL_LAN_API = 'http://172.20.10.2:8000';

/** Android emulator alias for this Mac's localhost, where the API is listening. */
const ANDROID_EMULATOR_API = 'http://10.0.2.2:8000';

function isAndroidEmulator() {
  if (Platform.OS !== 'android') return false;
  const constants = Platform.constants as { Model?: string; Fingerprint?: string };
  const model = constants.Model ?? '';
  const fingerprint = constants.Fingerprint ?? '';
  return (
    model.includes('sdk_gphone') ||
    model.includes('Emulator') ||
    model.includes('Android SDK built for') ||
    fingerprint.includes('generic') ||
    fingerprint.includes('emulator')
  );
}

/**
 * The browser and the Android emulator both run against this Mac, so they call localhost.
 * A physical phone uses the LAN address in EXPO_PUBLIC_API_URL.
 */
export const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000'
    : isAndroidEmulator()
      ? ANDROID_EMULATOR_API
      : (process.env.EXPO_PUBLIC_API_URL ?? LOCAL_LAN_API);
