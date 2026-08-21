import { Platform } from 'react-native';

import { ApiError, api } from './client';
import { sessionStore } from '../data/sessionStore';

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  format: string;
  uploadPreset: string;
  unsigned?: boolean;
};

type CloudinaryUpload = {
  secure_url: string;
  public_id: string;
};

function uploadConfigError(error: unknown): Error {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return new Error(
        'Sign in again before submitting. Photo upload needs a logged-in session (demo@rahscan.local).',
      );
    }
    if (error.status === 503) {
      return new Error(
        error.message ||
          'Photo upload is not configured on the server. Restart the backend after setting Cloudinary env vars.',
      );
    }
    return new Error(error.message);
  }
  return error instanceof Error ? error : new Error('Could not upload the photo.');
}

async function appendPhoto(form: FormData, uri: string) {
  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'pothole.jpg');
    return;
  }
  form.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'pothole.jpg',
  } as unknown as Blob);
}

export async function uploadReportPhoto(localUri: string): Promise<{
  photoUri: string;
  photoPublicId: string;
}> {
  if (!sessionStore.getSession()?.token) {
    throw new Error(
      'Sign in before submitting a report. Use demo@rahscan.local or the account you created.',
    );
  }

  let signature: UploadSignature;
  try {
    signature = await api<UploadSignature>('/uploads/signature', { method: 'POST' });
  } catch (error) {
    throw uploadConfigError(error);
  }

  const form = new FormData();
  await appendPhoto(form, localUri);
  form.append('upload_preset', signature.uploadPreset);
  if (!signature.unsigned) {
    form.append('api_key', signature.apiKey);
    form.append('timestamp', String(signature.timestamp));
    form.append('signature', signature.signature);
    form.append('folder', signature.folder);
    form.append('format', signature.format);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    let detail = 'Could not upload the photo to Cloudinary.';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      /* ignore non-JSON errors */
    }
    throw new Error(detail);
  }
  const uploaded = (await response.json()) as CloudinaryUpload;
  if (!uploaded.secure_url?.startsWith('https://')) {
    throw new Error('Cloudinary did not return an HTTPS image URL.');
  }
  return { photoUri: uploaded.secure_url, photoPublicId: uploaded.public_id };
}
