export const cities = ['Lahore', 'Karachi', 'Rawalpindi'] as const;
export type City = (typeof cities)[number];

export function uniqueCities(reports: { city: string }[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  reports.forEach((report) => {
    const name = report.city.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    list.push(name);
  });
  return list.sort((a, b) => a.localeCompare(b));
}

export const roadTypes = ['highway', 'serviceRoad', 'localRoad'] as const;
export type RoadType = (typeof roadTypes)[number];

export const roadTypeLabels: Record<RoadType, string> = {
  highway: 'Highway',
  serviceRoad: 'Service Road',
  localRoad: 'Local Road',
};

export const reportStatuses = [
  'pending',
  'assigned',
  'inProgress',
  'resolved',
] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reportStatusLabels: Record<ReportStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  inProgress: 'In progress',
  resolved: 'Resolved',
};

export const reportStatusColors: Record<ReportStatus, string> = {
  pending: '#E24B4A',
  assigned: '#E08A1E',
  inProgress: '#E08A1E',
  resolved: '#1B9A5B',
};

export const userStatuses = ['pending', 'inProgress', 'resolved'] as const;
export type UserStatus = (typeof userStatuses)[number];

export const userStatusLabels: Record<UserStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  resolved: 'Resolved',
};

export const userStatusColors: Record<UserStatus, string> = {
  pending: '#E24B4A',
  inProgress: '#E08A1E',
  resolved: '#1B9A5B',
};

export function toUserStatus(status: ReportStatus): UserStatus {
  if (status === 'resolved') return 'resolved';
  if (status === 'inProgress') return 'inProgress';
  return 'pending';
}

export const severities = ['small', 'medium', 'large'] as const;
export type Severity = (typeof severities)[number];

/** Map YOLO Title-Case (or any casing) onto the UI Severity keys. */
export function toSeverity(value: string | null | undefined): Severity {
  const key = (value ?? '').trim().toLowerCase();
  if (key === 'small' || key === 'medium' || key === 'large') return key;
  return 'medium';
}

export const severityLabels: Record<Severity, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const severityColors: Record<Severity, string> = {
  small: '#1B9A5B',
  medium: '#E08A1E',
  large: '#E24B4A',
};

export const severityRank: Record<Severity, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

export const timelineStages = [
  'submitted',
  'underReview',
  'repairAssigned',
  'inProgress',
  'resolved',
] as const;
export type TimelineStage = (typeof timelineStages)[number];

export const timelineStageLabels: Record<TimelineStage, string> = {
  submitted: 'Submitted',
  underReview: 'Under Review',
  repairAssigned: 'Repair Assigned',
  inProgress: 'In Progress',
  resolved: 'Resolved',
};

export const assignedTeams = [
  'unassigned',
  'roadMaintenance',
  'emergencyRepair',
  'inspection',
] as const;
export type AssignedTeam = (typeof assignedTeams)[number];

export const assignedTeamLabels: Record<AssignedTeam, string> = {
  unassigned: 'Unassigned',
  roadMaintenance: 'Road Maintenance',
  emergencyRepair: 'Emergency Repair',
  inspection: 'Inspection',
};

export const predefinedTeams: Exclude<AssignedTeam, 'unassigned'>[] = [
  'roadMaintenance',
  'emergencyRepair',
  'inspection',
];

export type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GeoCoords = {
  lat: number;
  lng: number;
};

export type Report = {
  id: string;
  referenceId: string;
  photoUri: string | null;
  city: string;
  area: string;
  roadType: RoadType;
  status: ReportStatus;
  assignedTeam: AssignedTeam;
  createdAt: Date;
  severity: Severity;
  confidence: number;
  description?: string;
  landmark?: string;
  address: string;
  coords?: GeoCoords;
  boundingBox: BoundingBox;
  boundingBoxes?: OverlayBox[];
  timelineStage: TimelineStage;
  submittedBy: string;
};

export type OverlayBox = BoundingBox & {
  severity: Severity;
  confidence?: number;
};

export type DetectionDraft = {
  photoUri: string;
  city: string;
  area: string;
  roadType: RoadType;
  address: string;
  coords?: GeoCoords;
  description?: string;
  landmark?: string;
  severity: Severity;
  confidence: number;
  boundingBox: BoundingBox;
  boundingBoxes: OverlayBox[];
};

export function overlayBoxesForReport(report: Pick<Report, 'boundingBox' | 'boundingBoxes' | 'severity' | 'confidence'>): OverlayBox[] {
  if (report.boundingBoxes && report.boundingBoxes.length > 0) {
    return [...report.boundingBoxes].sort((a, b) => a.left - b.left);
  }
  return [{ ...report.boundingBox, severity: report.severity, confidence: report.confidence }];
}

/** Strip RS- prefix, punctuation, and leading zeros so RS-0001 / rs0001 / 0001 / 1 match. */
export function normalizeReferenceId(value: string): string {
  const compact = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const withoutPrefix = compact.startsWith('rs') ? compact.slice(2) : compact;
  return withoutPrefix.replace(/^0+/, '');
}

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const LOW_CONFIDENCE_THRESHOLD = 75;

export function isIncompleteLocation(report: Pick<Report, 'coords' | 'address'>): boolean {
  return !report.coords || !report.address.trim();
}

export function isLowConfidence(report: Pick<Report, 'confidence'>): boolean {
  return report.confidence < LOW_CONFIDENCE_THRESHOLD;
}

export function isReportFlagged(report: Pick<Report, 'coords' | 'address' | 'confidence'>): boolean {
  return isIncompleteLocation(report) || isLowConfidence(report);
}

export const adminUiStatuses = ['pending', 'inProgress', 'resolved'] as const;
export type AdminUiStatus = (typeof adminUiStatuses)[number];

export const adminUiStatusLabels: Record<AdminUiStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  resolved: 'Resolved',
};

export function toAdminUiStatus(status: ReportStatus): AdminUiStatus {
  return toUserStatus(status);
}

export function fromAdminUiStatus(
  ui: AdminUiStatus,
  team: AssignedTeam,
): ReportStatus {
  if (ui === 'resolved') return 'resolved';
  if (ui === 'inProgress') return 'inProgress';
  return team === 'unassigned' ? 'pending' : 'assigned';
}

export function timelineFor(status: ReportStatus): TimelineStage {
  if (status === 'resolved') return 'resolved';
  if (status === 'inProgress') return 'inProgress';
  if (status === 'assigned') return 'repairAssigned';
  return 'underReview';
}

export const trafficDensities = ['low', 'medium', 'high'] as const;
export type TrafficDensity = (typeof trafficDensities)[number];

export const trafficDensityLabels: Record<TrafficDensity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Traffic is a property of the road class, not of city/area. */
export function trafficDensityFromRoadType(roadType: RoadType): TrafficDensity {
  if (roadType === 'highway') return 'high';
  if (roadType === 'serviceRoad') return 'low';
  return 'medium';
}

export function seedHash(city: string, area: string): number {
  let hash = 0;
  const seed = `${city}|${area}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type LifetimePrediction = {
  daysUntilCritical: number;
  deadline: Date;
  urgency: string;
  trafficDensity: TrafficDensity;
  rainProbability: number;
  temperatureC: number;
};

export function predictLifetime(report: Report): LifetimePrediction {
  const base =
    report.severity === 'large' ? 4 : report.severity === 'medium' ? 12 : 24;
  const roadPenalty = report.roadType === 'highway' ? 3 : report.roadType === 'serviceRoad' ? 1 : 0;
  const confidencePenalty = report.confidence < LOW_CONFIDENCE_THRESHOLD ? 2 : 0;
  const daysUntilCritical = Math.max(2, base - roadPenalty - confidencePenalty);
  const deadline = new Date(Date.now() + daysUntilCritical * 24 * 60 * 60 * 1000);
  const urgency =
    daysUntilCritical <= 5
      ? 'Urgent: schedule repair this week to avoid a critical failure.'
      : daysUntilCritical <= 14
        ? 'Plan repair soon; monsoon wear may accelerate damage.'
        : 'Monitor the segment; current depth is still within a safe window.';
  const hash = seedHash(report.city, report.area);
  return {
    daysUntilCritical,
    deadline,
    urgency,
    trafficDensity: trafficDensities[hash % trafficDensities.length],
    rainProbability: 20 + (hash % 61),
    temperatureC: 24 + ((hash >>> 8) % 15),
  };
}

export const predictiveCategories = ['urgent', 'planRepair', 'monitor'] as const;
export type PredictiveCategory = (typeof predictiveCategories)[number];

export const predictiveCategoryLabels: Record<PredictiveCategory, string> = {
  urgent: 'Urgent',
  planRepair: 'Plan Repair',
  monitor: 'Monitor',
};

export type PredictiveTrend = 'increasing' | 'decreasing' | 'stable';

export type PredictiveSegment = {
  id: string;
  city: string;
  area: string;
  category: PredictiveCategory;
  predictedReportsNext30Days: number;
  historicalAvgReportsPer30Days: number;
  trendDirection: PredictiveTrend;
  riskWindow: string;
  priority: 'Urgent' | 'Plan Repair' | 'Monitor';
  budgetPkr: number;
  reason: string;
};

export function predictiveSegments(reports: Report[]): PredictiveSegment[] {
  const groups = new Map<string, Report[]>();
  reports.forEach((report) => {
    const key = `${report.city}|${report.area}`;
    const list = groups.get(key) ?? [];
    list.push(report);
    groups.set(key, list);
  });

  return [...groups.entries()].map(([key, list]) => {
    const [city, area] = key.split('|');
    const open = list.filter((item) => toUserStatus(item.status) !== 'resolved');
    const large = open.filter((item) => item.severity === 'large').length;
    const category: PredictiveCategory =
      large >= 1 || open.length >= 3 ? 'urgent' : open.length >= 2 ? 'planRepair' : 'monitor';
    const budgetPkr =
      category === 'urgent' ? 850000 + open.length * 120000
        : category === 'planRepair' ? 320000 + open.length * 80000
          : 95000 + list.length * 15000;
    const reason =
      category === 'urgent'
        ? 'Repeated high-severity damage on this stretch.'
        : category === 'planRepair'
          ? 'Multiple open reports suggest accelerating wear.'
          : 'Isolated or resolved damage; keep on the watch list.';
    return {
      id: key,
      city,
      area,
      category,
      predictedReportsNext30Days: list.length,
      historicalAvgReportsPer30Days: list.length,
      trendDirection: 'stable' as PredictiveTrend,
      riskWindow: 'Low risk (30+ days)',
      priority: predictiveCategoryLabels[category],
      budgetPkr,
      reason,
    };
  });
}

export function mockDetect(city: string, area: string): {
  severity: Severity;
  confidence: number;
  boundingBox: BoundingBox;
} {
  const hash = seedHash(city, area);
  return {
    severity: severities[hash % severities.length],
    confidence: 72 + (hash % 24),
    boundingBox: {
      left: 16 + (hash % 14),
      top: 24 + (hash % 18),
      width: 40 + (hash % 20),
      height: 26 + (hash % 14),
    },
  };
}

