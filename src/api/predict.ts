import {
  trafficDensityFromRoadType,
  type BoundingBox,
  type PredictiveCategory,
  type PredictiveSegment,
  type Report,
  type RoadType,
  type Severity,
  type TrafficDensity,
} from '../models/report';
import { api } from './client';

export type PredictiveMaintenanceApiSegment = {
  segment_id: string;
  city: string;
  area: string;
  road_type: string;
  predicted_reports_next_30_days: number;
  historical_avg_reports_per_30_days: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  risk_window: string;
  priority: 'Urgent' | 'Plan Repair' | 'Monitor';
  category: 'Urgent' | 'Plan Repair' | 'Monitor';
  budget_estimate_pkr: number;
};

const CATEGORY_MAP: Record<PredictiveMaintenanceApiSegment['category'], PredictiveCategory> = {
  Urgent: 'urgent',
  'Plan Repair': 'planRepair',
  Monitor: 'monitor',
};

function reasonForSegment(segment: PredictiveMaintenanceApiSegment): string {
  const road = segment.road_type.trim();
  const place = road ? `this ${road.toLowerCase()}` : 'this stretch';

  if (segment.trend_direction === 'increasing') {
    return `Forecast shows accelerating wear on ${place}.`;
  }
  if (segment.trend_direction === 'decreasing') {
    return `Forecast shows improving conditions on ${place}.`;
  }
  if (segment.trend_direction === 'stable') {
    return `Stable forecast; keep ${place} on the watch list.`;
  }

  // Category fallbacks if trend is unexpected
  const category = CATEGORY_MAP[segment.category] ?? 'monitor';
  if (category === 'urgent') {
    return 'High predicted report volume on this stretch.';
  }
  if (category === 'planRepair') {
    return 'Elevated forecast suggests scheduling repair soon.';
  }
  return 'Isolated forecast risk; keep on the watch list.';
}

export function mapPredictiveMaintenanceSegment(
  segment: PredictiveMaintenanceApiSegment,
): PredictiveSegment {
  return {
    id: segment.segment_id,
    city: segment.city,
    area: segment.area,
    category: CATEGORY_MAP[segment.category] ?? 'monitor',
    predictedReportsNext30Days: segment.predicted_reports_next_30_days,
    historicalAvgReportsPer30Days: segment.historical_avg_reports_per_30_days,
    trendDirection: segment.trend_direction,
    riskWindow: segment.risk_window,
    priority: segment.priority,
    budgetPkr: segment.budget_estimate_pkr,
    reason: reasonForSegment(segment),
  };
}

export async function fetchPredictiveMaintenance(): Promise<PredictiveSegment[]> {
  const rows = await api<PredictiveMaintenanceApiSegment[]>('/api/predictive-maintenance');
  return rows.map(mapPredictiveMaintenanceSegment);
}

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
    condition?: 'Clear' | 'Cloudy' | 'Rainy' | null;
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
