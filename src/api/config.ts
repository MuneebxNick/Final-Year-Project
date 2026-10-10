import { Platform } from 'react-native';

/** This Mac's current LAN address, so a phone on the same network can reach the API. */
const LOCAL_LAN_API = 'http://172.20.10.2:8000';

/**
 * The browser runs on this Mac, so it must call the local API.
 * EXPO_PUBLIC_API_URL is the phone LAN address and is not reachable from the web app.
 */
export const API_URL =
  Platform.OS === 'web' ? 'http://localhost:8000' : (process.env.EXPO_PUBLIC_API_URL ?? LOCAL_LAN_API);
