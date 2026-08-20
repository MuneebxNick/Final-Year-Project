import {
  severityLabels,
  toUserStatus,
  type Report,
  type Severity,
  type UserStatus,
} from '../models/report';

export function countByUserStatus(reports: Report[]): Record<UserStatus, number> {
  return {
    pending: reports.filter((report) => toUserStatus(report.status) === 'pending').length,
    inProgress: reports.filter((report) => toUserStatus(report.status) === 'inProgress').length,
    resolved: reports.filter((report) => toUserStatus(report.status) === 'resolved').length,
  };
}

export function countBySeverity(reports: Report[]): Record<Severity, number> {
  return {
    small: reports.filter((report) => report.severity === 'small').length,
    medium: reports.filter((report) => report.severity === 'medium').length,
    large: reports.filter((report) => report.severity === 'large').length,
  };
}

export function resolutionRate(reports: Report[]): number {
  if (reports.length === 0) return 0;
  return Math.round((countByUserStatus(reports).resolved / reports.length) * 100);
}

export type TrendMode = 'weekly' | 'monthly';

export type TrendPoint = {
  label: string;
  count: number;
};

export function trendSeries(reports: Report[], mode: TrendMode): TrendPoint[] {
  const now = new Date();
  if (mode === 'weekly') {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(now.getDate() - (6 - index));
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return {
        label: day.toLocaleDateString('en-GB', { weekday: 'short' }),
        count: reports.filter((report) => report.createdAt >= day && report.createdAt < next).length,
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (4 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count: reports.filter((report) => report.createdAt >= start && report.createdAt < end).length,
    };
  });
}

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function severityShare(reports: Report[]): { severity: Severity; label: string; count: number; pct: number }[] {
  const counts = countBySeverity(reports);
  const total = Math.max(reports.length, 1);
  return (Object.keys(counts) as Severity[]).map((severity) => ({
    severity,
    label: severityLabels[severity],
    count: counts[severity],
    pct: Math.round((counts[severity] / total) * 100),
  }));
}
