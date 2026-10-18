import {
  areaLabel,
  reportStatusLabels,
  roadTypeLabels,
  roadTypes,
  severityLabels,
  severities,
  toUserStatus,
  userStatuses,
  userStatusLabels,
  type Report,
  type RoadType,
  type Severity,
  type UserStatus,
} from '../models/report';

export function countByUserStatus(reports: Report[]): Record<UserStatus, number> {
  return {
    pending: reports.filter((report) => toUserStatus(report.status) === 'pending').length,
    inProgress: reports.filter((report) => toUserStatus(report.status) === 'inProgress').length,
    completed: reports.filter((report) => toUserStatus(report.status) === 'completed').length,
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

export type ShareSlice<K extends string = string> = {
  key: K;
  label: string;
  count: number;
  pct: number;
};

export type SeverityTrendPoint = {
  label: string;
  small: number;
  medium: number;
  large: number;
};

export type PeriodTotals = {
  current: number;
  previous: number;
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Bucket = {
  label: string;
  start: Date;
  end: Date;
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function monthLabel(date: Date, now: Date): string {
  const month = SHORT_MONTHS[date.getMonth()] ?? '';
  if (date.getFullYear() === now.getFullYear()) return month;
  return `${month} ${String(date.getFullYear()).slice(2)}`;
}

function bucketsFor(mode: TrendMode, now = new Date()): Bucket[] {
  if (mode === 'weekly') {
    const today = startOfDay(now);
    return Array.from({ length: 7 }, (_, index) => {
      const start = addDays(today, index - 6);
      return {
        label: start.toLocaleDateString('en-GB', { weekday: 'short' }),
        start,
        end: addDays(start, 1),
      };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      label: monthLabel(start, now),
      start,
      end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
    };
  });
}

function countBetween(reports: Report[], start: Date, end: Date): number {
  return reports.filter((report) => report.createdAt >= start && report.createdAt < end).length;
}

/** Integer percents that always add up to 100 when there is any data. */
function percentShares(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (const item of order) {
    if (remainder <= 0) break;
    floors[item.index] += 1;
    remainder -= 1;
  }
  return floors;
}

function shareSlices<K extends string>(
  keys: readonly K[],
  labelOf: (key: K) => string,
  countOf: (key: K) => number,
): ShareSlice<K>[] {
  const counts = keys.map((key) => countOf(key));
  const pcts = percentShares(counts);
  return keys.map((key, index) => ({
    key,
    label: labelOf(key),
    count: counts[index] ?? 0,
    pct: pcts[index] ?? 0,
  }));
}

export function trendSeries(reports: Report[], mode: TrendMode): TrendPoint[] {
  return bucketsFor(mode).map((bucket) => ({
    label: bucket.label,
    count: countBetween(reports, bucket.start, bucket.end),
  }));
}

export function severityTrend(reports: Report[], mode: TrendMode): SeverityTrendPoint[] {
  return bucketsFor(mode).map((bucket) => {
    const inBucket = reports.filter(
      (report) => report.createdAt >= bucket.start && report.createdAt < bucket.end,
    );
    const counts = countBySeverity(inBucket);
    return {
      label: bucket.label,
      small: counts.small,
      medium: counts.medium,
      large: counts.large,
    };
  });
}

export function periodTotals(reports: Report[], mode: TrendMode, now = new Date()): PeriodTotals {
  if (mode === 'weekly') {
    const currentStart = addDays(startOfDay(now), -6);
    const previousStart = addDays(currentStart, -7);
    return {
      current: countBetween(reports, currentStart, addDays(currentStart, 7)),
      previous: countBetween(reports, previousStart, currentStart),
    };
  }
  const currentStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return {
    current: countBetween(reports, currentStart, currentEnd),
    previous: countBetween(reports, previousStart, currentStart),
  };
}

export function periodDeltaLabel(totals: PeriodTotals, mode: TrendMode): string {
  const diff = totals.current - totals.previous;
  const windowLabel = mode === 'weekly' ? 'the previous 7 days' : 'the previous 6 months';
  if (diff === 0) return `Same as ${windowLabel}`;
  const signed = diff > 0 ? `+${diff}` : String(diff);
  return `${signed} compared with ${windowLabel}`;
}

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function severityShare(reports: Report[]): ShareSlice<Severity>[] {
  const counts = countBySeverity(reports);
  return shareSlices(severities, (severity) => severityLabels[severity], (severity) => counts[severity]);
}

export function statusShare(reports: Report[]): ShareSlice<UserStatus>[] {
  const counts = countByUserStatus(reports);
  return shareSlices(
    userStatuses,
    (status) => (status === 'completed' ? reportStatusLabels.completed : userStatusLabels[status]),
    (status) => counts[status],
  );
}

export function roadShare(reports: Report[]): ShareSlice<RoadType>[] {
  return shareSlices(
    roadTypes,
    (roadType) => roadTypeLabels[roadType],
    (roadType) => reports.filter((report) => report.roadType === roadType).length,
  );
}

function groupedShare(
  reports: Report[],
  pick: (report: Report) => string,
  limit: number,
): ShareSlice[] {
  const groups = new Map<string, Map<string, number>>();
  reports.forEach((report) => {
    const raw = pick(report).trim() || 'Unknown';
    const key = raw.toLocaleLowerCase();
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(raw, (spellings.get(raw) ?? 0) + 1);
    groups.set(key, spellings);
  });

  const rows = [...groups.entries()].map(([key, spellings]) => {
    let count = 0;
    let label = key;
    let best = -1;
    spellings.forEach((spellingCount, spelling) => {
      count += spellingCount;
      const titled = spelling.charAt(0) === spelling.charAt(0).toLocaleUpperCase();
      const score = spellingCount * 2 + (titled ? 1 : 0);
      if (score > best) {
        best = score;
        label = spelling;
      }
    });
    return { key, label, count };
  });
  rows.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  const head: typeof rows = [];
  const rest: typeof rows = [];
  rows.forEach((row) => {
    if (head.length < limit && (row.count > 1 || head.length < 3)) head.push(row);
    else rest.push(row);
  });
  const tail = rest.reduce((sum, row) => sum + row.count, 0);
  const visible = tail > 0 ? [...head, { key: 'other', label: 'Other', count: tail }] : head;
  const pcts = percentShares(visible.map((row) => row.count));
  return visible.map((row, index) => ({ ...row, pct: pcts[index] ?? 0 }));
}

export function cityShare(reports: Report[], limit = 5): ShareSlice[] {
  return groupedShare(reports, (report) => report.city, limit);
}

export function areaShare(reports: Report[], limit = 5): ShareSlice[] {
  return groupedShare(reports, (report) => areaLabel(report), limit);
}
