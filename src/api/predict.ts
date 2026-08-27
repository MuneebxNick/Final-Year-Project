import {
  trafficDensityFromRoadType,
  type BoundingBox,
  type Report,
  type RoadType,
  type Severity,
  type TrafficDensity,
} from '../models/report';
import { api } from './client';

export type LifetimePredictRequest = {
  severity: Severity | 'Small' | 'Medium' | 'Large';
  boundingBoxPercentage: number;
  roadType: RoadType | 'Highway' | 'Service Road' | 'Simple Road';
  trafficDensity: TrafficDensity | 'Low' | 'Medium' | 'High';
  location: string;
};

export type LifetimePredictResponse = {
  daysUntilCritical: number;
  recommendedRepairDeadline: string;
  urgencyNote: 'Critical' | 'Moderate' | 'Low urgency';
  inputs: {
    severity: string;
    boundingBoxPercentage: number;
    roadType: string;
    trafficDensity: string;
    location: string;
  };
  weather: {
    rainfallProbability: number;
    temperatureCelsius: number;
    season: 'Monsoon' | 'Summer' | 'Winter';
    source: 'open-meteo' | 'fallback';
    latitude: number | null;
    longitude: number | null;
  };
};

/** Bounding boxes are stored as % of the image; area% = (w% * h%) / 100. */
export function boundingBoxPercentage(box: BoundingBox): number {
  const pct = (box.width * box.height) / 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

export function locationForLifetime(report: Pick<Report, 'area' | 'city' | 'address'>): string {
  const area = report.area.trim();
  const city = report.city.trim();
  if (area && city) return `${area}, ${city}`;
  return city || area || report.address.trim() || 'Pakistan';
}

export function lifetimePredictBody(report: Report): LifetimePredictRequest {
  return {
    severity: report.severity,
    boundingBoxPercentage: boundingBoxPercentage(report.boundingBox),
    roadType: report.roadType,
    trafficDensity: trafficDensityFromRoadType(report.roadType),
    location: locationForLifetime(report),
  };
}

export async function fetchLifetimePrediction(report: Report): Promise<LifetimePredictResponse> {
  return api<LifetimePredictResponse>('/api/predict/lifetime', {
    method: 'POST',
    body: JSON.stringify(lifetimePredictBody(report)),
  });
}
