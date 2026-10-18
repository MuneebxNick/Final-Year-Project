import { File } from 'expo-file-system';
import { Platform } from 'react-native';

function isBrowserFile(uri: string) {
  return (
    Platform.OS === 'web' ||
    uri.startsWith('blob:') ||
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  );
}

/** Attach a picked photo. Android Expo fetch accepts a File, not a `{ uri, type, name }` object. */
export async function appendPhoto(form: FormData, uri: string, filename = 'pothole.jpg') {
  if (isBrowserFile(uri)) {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, filename);
    return;
  }
  form.append('file', new File(uri));
}
