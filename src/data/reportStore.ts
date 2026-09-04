import { useEffect, useSyncExternalStore } from 'react';

import { api } from '../api/client';
import type {
  AdminUiStatus,
  AssignedTeam,
  DetectionDraft,
  Report,
} from '../models/report';
import { sessionStore, useSession } from './sessionStore';

export const DEMO_CITIZEN_EMAIL = 'demo@rahscan.local';

type Listener = () => void;

type ApiReport = Omit<Report, 'createdAt'> & { createdAt: string };

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
  const boxes = raw.boundingBoxes?.length
    ? raw.boundingBoxes
    : (raw as { bounding_boxes?: Report['boundingBoxes'] }).bounding_boxes;
  return {
    ...raw,
    referenceId: raw.referenceId ?? '',
    createdAt: new Date(raw.createdAt),
    boundingBoxes: boxes && boxes.length > 0 ? boxes : undefined,
  };
}

class ReportStore {
  private reports: Report[] = [];
  private hydrated = false;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getReports = () => this.reports;

  getHydrated = () => this.hydrated;

  byId(id: string): Report | undefined {
    return this.reports.find((report) => report.id === id);
  }

  async refresh() {
    const session = sessionStore.getSession();
    if (!session?.token) {
      this.reports = [];
      this.hydrated = true;
      this.notify();
      return;
    }
    try {
      const path = session.role === 'admin' ? '/admin/reports' : '/reports/me';
      const rows = await api<ApiReport[]>(path);
      this.reports = rows.map(parseReport);
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

  async updateAssignment(id: string, team: AssignedTeam, status: AdminUiStatus): Promise<Report> {
    const updated = await api<ApiReport>(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTeam: team, status }),
    });
    const report = parseReport(updated);
    this.reports = this.reports.map((item) => (item.id === id ? report : item));
    this.notify();
    return report;
  }

  clear() {
    this.reports = [];
    this.hydrated = false;
    this.notify();
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
