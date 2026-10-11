import { Image, Platform } from 'react-native';

import { api } from './client';
import { toSeverity, type BoundingBox, type OverlayBox, type Severity } from '../models/report';

export type YoloSeverity = 'Small' | 'Medium' | 'Large';

export type YoloBoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type YoloDetection = {
  bounding_box: YoloBoundingBox;
  confidence: number;
  severity: YoloSeverity;
  area_percentage: number;
};

export type YoloDetectResponse = {
  detections: YoloDetection[];
  highest_severity: YoloSeverity | null;
  message: string | null;
};

export type MappedDetection = {
  severity: Severity;
  confidence: number;
  boundingBox: BoundingBox;
  boundingBoxes: OverlayBox[];
};

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

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

export function xyxyToPercent(box: YoloBoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  return {
    left: (box.x1 / imageWidth) * 100,
    top: (box.y1 / imageHeight) * 100,
    width: ((box.x2 - box.x1) / imageWidth) * 100,
    height: ((box.y2 - box.y1) / imageHeight) * 100,
  };
}

export function pickHighestDetection(
  detections: YoloDetection[],
  highestSeverity: YoloSeverity,
): YoloDetection {
  const matches = detections.filter((item) => item.severity === highestSeverity);
  const pool = matches.length > 0 ? matches : detections;
  return pool.reduce((best, item) => (item.area_percentage > best.area_percentage ? item : best));
}

export async function detectPotholes(photoUri: string): Promise<YoloDetectResponse> {
  const form = new FormData();
  await appendPhoto(form, photoUri);
  return api<YoloDetectResponse>('/api/detect', {
    method: 'POST',
    body: form,
  });
}

export async function mapYoloToDraft(photoUri: string, result: YoloDetectResponse): Promise<MappedDetection | null> {
  if (!result.highest_severity || result.detections.length === 0) {
    return null;
  }
  const chosen = pickHighestDetection(result.detections, result.highest_severity);
  const { width, height } = await getImageSize(photoUri);
  return {
    severity: toSeverity(chosen.severity),
    confidence: Math.round(chosen.confidence * 100),
    boundingBox: xyxyToPercent(chosen.bounding_box, width, height),
    boundingBoxes: result.detections.map((item) => ({
      ...xyxyToPercent(item.bounding_box, width, height),
      severity: toSeverity(item.severity),
      confidence: Math.round(item.confidence * 100),
    })),
  };
}
