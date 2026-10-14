import { useEffect, useSyncExternalStore } from 'react';

import { api } from '../api/client';
import type {
  AssignedTeam,
  BoundingBox,
  DetectionDraft,
  GeoCoords,
  Report,
  ReportEvent,
  ReportEventType,
  ReportStatus,
  RoadType,
  Severity,
  TeamBox,
  TeamKey,
  TeamReport,
  TeamStats,
  TimelineStage,
} from '../models/report';
import { sessionStore, useSession } from './sessionStore';

export const DEMO_CITIZEN_EMAIL = 'demo@rahscan.local';

type Listener = () => void;

type ApiTimelineItem = {
  label: string;
  at: string;
  note?: string | null;
};

type ApiEvent = {
  id: string;
  type: ReportEventType;
  time: string;
  actor?: string | null;
  note?: string | null;
  photoUrl?: string | null;
  team?: string | null;
  deadlineAt?: string | null;
  fromStatus?: string | null;
  toStatus: string;
};

type ApiReport = {
  id: string;
  referenceId?: string;
  photoUri: string | null;
  city: string;
  area: string;
  roadType: RoadType;
  status: ReportStatus;
  assignedTeam: AssignedTeam;
  createdAt: string;
  severity: Severity;
  confidence: number;
  description?: string | null;
  landmark?: string | null;
  address: string;
  coords?: GeoCoords | null;
  boundingBox: BoundingBox;
  boundingBoxes?: Report['boundingBoxes'];
  bounding_boxes?: Report['boundingBoxes'];
  timelineStage: TimelineStage;
  submittedBy: string;
  completionNote?: string | null;
  timeline?: ApiTimelineItem[];
  deadlineAt?: string | null;
  overdue?: boolean;
  assignmentNote?: string | null;
  completionPhotoUri?: string | null;
  completionPhotoPublicId?: string | null;
  events?: ApiEvent[];
};

type ApiTeamBox = TeamBox & { confidence?: number };

type ApiTeamReport = {
  id: string;
  referenceId?: string;
  photoUri: string | null;
  city: string;
  area: string;
  roadType: RoadType;
  status: ReportStatus;
  assignedTeam: AssignedTeam;
  createdAt: string;
  severity: Severity;
  description?: string | null;
  landmark?: string | null;
  address?: string;
  coords?: GeoCoords | null;
  boundingBox: BoundingBox;
  boundingBoxes?: ApiTeamBox[];
  deadlineAt?: string | null;
  overdue?: boolean;
  assignmentNote?: string | null;
  rejectionReason?: string | null;
  completionPhotoUri?: string | null;
  completionPhotoPublicId?: string | null;
  completionNote?: string | null;
};

const emptyTeamStats = (): TeamStats => ({
  assigned: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0,
});

let formResetPending = false;

export function markFormReset() {
  formResetPending = true;
}

export function consumeFormReset() {
  const pending = formResetPending;
  formResetPending = false;
  return pending;
}

function parseReport(raw: ApiReport): Report {
  const boxes = raw.boundingBoxes?.length ? raw.boundingBoxes : raw.bounding_boxes;
  return {
    id: raw.id,
    referenceId: raw.referenceId ?? '',
    photoUri: raw.photoUri,
    city: raw.city,
    area: raw.area,
    roadType: raw.roadType,
    status: raw.status,
    assignedTeam: raw.assignedTeam,
    createdAt: new Date(raw.createdAt),
    severity: raw.severity,
    confidence: raw.confidence,
    description: raw.description ?? undefined,
    landmark: raw.landmark ?? undefined,
    address: raw.address ?? '',
    coords: raw.coords ?? undefined,
    boundingBox: raw.boundingBox,
    boundingBoxes: boxes && boxes.length > 0 ? boxes : undefined,
    timelineStage: raw.timelineStage,
    submittedBy: raw.submittedBy ?? '',
    completionNote: raw.completionNote ?? null,
    deadlineAt: raw.deadlineAt == null ? raw.deadlineAt : new Date(raw.deadlineAt),
    overdue: raw.overdue,
    assignmentNote: raw.assignmentNote ?? null,
    completionPhotoUri: raw.completionPhotoUri ?? null,
    completionPhotoPublicId: raw.completionPhotoPublicId ?? null,
    timeline: raw.timeline?.map((item) => ({
      label: item.label,
      at: new Date(item.at),
      note: item.note ?? null,
    })),
    events: raw.events?.map(parseEvent),
  };
}

function parseEvent(event: ApiEvent): ReportEvent {
  return {
    id: event.id,
    type: event.type,
    time: new Date(event.time),
    actor: event.actor ?? null,
    note: event.note ?? null,
    photoUrl: event.photoUrl ?? null,
    team: event.team ?? null,
    deadlineAt: event.deadlineAt ? new Date(event.deadlineAt) : null,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus,
  };
}

function parseTeamReport(raw: ApiTeamReport): TeamReport {
  const boxes = (raw.boundingBoxes ?? []).map(
    (box): TeamBox => ({
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      severity: box.severity,
    }),
  );
  return {
    id: raw.id,
    referenceId: raw.referenceId ?? '',
    photoUri: raw.photoUri,
    city: raw.city,
    area: raw.area,
    roadType: raw.roadType,
    status: raw.status,
    assignedTeam: raw.assignedTeam,
    createdAt: new Date(raw.createdAt),
    severity: raw.severity,
    description: raw.description ?? undefined,
    landmark: raw.landmark ?? undefined,
    address: raw.address ?? '',
    coords: raw.coords ?? undefined,
    boundingBox: raw.boundingBox,
    boundingBoxes: boxes.length > 0 ? boxes : undefined,
    deadlineAt: raw.deadlineAt ? new Date(raw.deadlineAt) : null,
    overdue: Boolean(raw.overdue),
    assignmentNote: raw.assignmentNote ?? null,
    rejectionReason: raw.rejectionReason ?? null,
    completionPhotoUri: raw.completionPhotoUri ?? null,
    completionPhotoPublicId: raw.completionPhotoPublicId ?? null,
    completionNote: raw.completionNote ?? null,
  };
}

class ReportStore {
  private reports: Report[] = [];
  private teamReports: TeamReport[] = [];
  private teamStats: TeamStats = emptyTeamStats();
  private hydrated = false;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getReports = () => this.reports;

  getTeamReports = () => this.teamReports;

  getTeamStats = () => this.teamStats;

  getHydrated = () => this.hydrated;

  byId(id: string): Report | undefined {
    return this.reports.find((report) => report.id === id);
  }

  teamById(id: string): TeamReport | undefined {
    return this.teamReports.find((report) => report.id === id);
  }

  async refresh() {
    const session = sessionStore.getSession();
    if (!session?.token) {
      this.clear();
      return;
    }
    try {
      if (session.role === 'team') {
        this.reports = [];
        const [rows, stats] = await Promise.all([
          api<ApiTeamReport[]>('/team/reports'),
          api<TeamStats>('/team/stats'),
        ]);
        this.teamReports = rows.map(parseTeamReport);
        this.teamStats = stats;
      } else {
        this.teamReports = [];
        this.teamStats = emptyTeamStats();
        const path = session.role === 'admin' ? '/admin/reports' : '/reports/me';
        const rows = await api<ApiReport[]>(path);
        this.reports = rows.map(parseReport);
      }
      this.hydrated = true;
      this.notify();
    } catch (error) {
      this.hydrated = true;
      this.notify();
      throw error;
    }
  }

  async submit(
    draft: DetectionDraft,
    photo: { photoUri: string; photoPublicId: string },
  ): Promise<Report> {
    const created = await api<ApiReport>('/reports', {
      method: 'POST',
      body: JSON.stringify({
        photoUri: photo.photoUri,
        photoPublicId: photo.photoPublicId,
        city: draft.city,
        area: draft.area,
        roadType: draft.roadType,
        address: draft.address,
        coords: draft.coords,
        description: draft.description,
        landmark: draft.landmark,
        severity: draft.severity,
        confidence: draft.confidence,
        boundingBox: draft.boundingBox,
        boundingBoxes: draft.boundingBoxes,
      }),
    });
    const report = parseReport(created);
    this.reports = [report, ...this.reports];
    this.notify();
    return report;
  }

  async loadAdminDetail(id: string): Promise<Report> {
    const report = parseReport(await api<ApiReport>(`/admin/reports/${id}`));
    this.upsert(report);
    return report;
  }

  async assignReport(
    id: string,
    body: { team: TeamKey; deadline: string; note: string | null },
  ): Promise<Report> {
    const report = parseReport(
      await api<ApiReport>(`/admin/reports/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    this.upsert(report);
    return report;
  }

  async verifyReport(id: string): Promise<Report> {
    const report = parseReport(
      await api<ApiReport>(`/admin/reports/${id}/verify`, { method: 'POST' }),
    );
    this.upsert(report);
    return report;
  }

  async rejectReport(id: string, reason: string): Promise<Report> {
    const report = parseReport(
      await api<ApiReport>(`/admin/reports/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    );
    this.upsert(report);
    return report;
  }

  async loadTeamReport(id: string): Promise<TeamReport> {
    const report = parseTeamReport(await api<ApiTeamReport>(`/team/reports/${id}`));
    this.replaceTeam(report);
    return report;
  }

  async acceptTeam(id: string): Promise<TeamReport> {
    const report = parseTeamReport(
      await api<ApiTeamReport>(`/team/reports/${id}/accept`, { method: 'POST' }),
    );
    this.replaceTeam(report);
    await this.reloadTeamStats();
    return report;
  }

  async completeTeam(
    id: string,
    body: { photoUri: string; photoPublicId: string; note: string },
  ): Promise<TeamReport> {
    const report = parseTeamReport(
      await api<ApiTeamReport>(`/team/reports/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    this.replaceTeam(report);
    await this.reloadTeamStats();
    return report;
  }

  async escalateTeam(id: string, reason: string): Promise<TeamReport> {
    const report = parseTeamReport(
      await api<ApiTeamReport>(`/team/reports/${id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    );
    this.replaceTeam(report);
    await this.reloadTeamStats();
    return report;
  }

  clear() {
    this.reports = [];
    this.teamReports = [];
    this.teamStats = emptyTeamStats();
    this.hydrated = false;
    this.notify();
  }

  private upsert(report: Report) {
    const exists = this.reports.some((item) => item.id === report.id);
    this.reports = exists
      ? this.reports.map((item) => (item.id === report.id ? report : item))
      : [report, ...this.reports];
    this.notify();
  }

  private replaceTeam(report: TeamReport) {
    const session = sessionStore.getSession();
    const dropped =
      report.assignedTeam === 'unassigned' ||
      (session?.team != null && report.assignedTeam !== session.team);
    if (dropped) {
      this.teamReports = this.teamReports.filter((item) => item.id !== report.id);
    } else {
      const exists = this.teamReports.some((item) => item.id === report.id);
      this.teamReports = exists
        ? this.teamReports.map((item) => (item.id === report.id ? report : item))
        : [report, ...this.teamReports];
    }
    this.notify();
  }

  private async reloadTeamStats() {
    try {
      this.teamStats = await api<TeamStats>('/team/stats');
      this.notify();
    } catch {
      /* The report update already landed. */
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const reportStore = new ReportStore();

export function useReports(): Report[] {
  const session = useSession();
  const reports = useSyncExternalStore(reportStore.subscribe, reportStore.getReports);

  useEffect(() => {
    if (!session?.token) {
      reportStore.clear();
      return;
    }
    if (session.role === 'team') return;
    void reportStore.refresh().catch(() => undefined);
  }, [session?.token, session?.role]);

  return reports;
}

export function useReportsHydrated(): boolean {
  return useSyncExternalStore(reportStore.subscribe, reportStore.getHydrated);
}

export function useMyReports(): Report[] {
  const reports = useReports();
  const session = useSession();
  const email = session?.email.trim().toLowerCase();
  if (!email) return [];
  return reports.filter((report) => report.submittedBy.trim().toLowerCase() === email);
}

export function useTeamReports(): TeamReport[] {
  const session = useSession();
  const reports = useSyncExternalStore(reportStore.subscribe, reportStore.getTeamReports);

  useEffect(() => {
    if (session?.role !== 'team' || !session.token) return;
    void reportStore.refresh().catch(() => undefined);
  }, [session?.token, session?.role]);

  return reports;
}

export function useTeamStats(): TeamStats {
  return useSyncExternalStore(reportStore.subscribe, reportStore.getTeamStats);
}
