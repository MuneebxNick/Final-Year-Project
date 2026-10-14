import { createElement, useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OutlineButton, TealButton } from '../components/Buttons';
import { FilterChip } from '../components/FilterChip';
import { LifetimePredictionCard } from '../components/LifetimePredictionCard';
import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { OverdueBadge, StatusBadge } from '../components/StatusBadge';
import { TextField } from '../components/TextField';
import { reportStore, useReports, useReportsHydrated } from '../data/reportStore';
import { AdminShell } from '../layout/AdminShell';
import { ScreenContainer } from '../layout/ScreenContainer';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  assignedTeamLabels,
  endOfLocalDateInputIso,
  formatReportDateTime,
  isIncompleteLocation,
  isLowConfidence,
  isTeamKey,
  localDateInputValue,
  overlayBoxesForReport,
  predefinedTeams,
  reportEventLabels,
  roadTypeLabels,
  type Report,
  type ReportEvent,
  type TeamKey,
} from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReportDetail'>;
type BusyAction = 'assign' | 'verify' | 'reject' | null;

function alertCopy(title: string, message?: string): string {
  if (!message || message === title) return title;
  return `${title}\n${message}`;
}

const assignable = new Set(['pending', 'escalated', 'assigned', 'inProgress']);

export function AdminReportDetailScreen({ navigation, route }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const hydrated = useReportsHydrated();
  const listed = reports.find((item) => item.id === route.params.reportId);
  const [detail, setDetail] = useState<Report | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const report = detail ?? listed ?? null;

  const [team, setTeam] = useState<TeamKey>('roadMaintenance');
  const [deadlineDate, setDeadlineDate] = useState(() => localDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ scope: Exclude<BusyAction, null>; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<BusyAction>(null);

  useEffect(() => {
    let cancelled = false;
    setHistoryError(null);
    void reportStore.loadAdminDetail(route.params.reportId).then(
      (next) => {
        if (!cancelled) setDetail(next);
      },
      (error: unknown) => {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : 'Could not load activity.');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [route.params.reportId]);

  useEffect(() => {
    if (!report) return;
    setTeam(report.assignedTeam === 'unassigned' ? 'roadMaintenance' : report.assignedTeam);
    setDeadlineDate(
      report.deadlineAt ? localDateInputValue(report.deadlineAt) : localDateInputValue(new Date()),
    );
    setNote('');
    setReason('');
    setDateError(null);
    setReasonError(null);
    setActionError(null);
  }, [report?.id, report?.status, report?.assignedTeam, report?.deadlineAt?.getTime()]);

  if (!report && !hydrated) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Loading report…</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This report is no longer available.</Text>
      </View>
    );
  }

  const flags = [
    isIncompleteLocation(report) ? 'Incomplete location' : null,
    isLowConfidence(report) ? 'Low detection confidence' : null,
  ].filter(Boolean) as string[];

  const events = [...(report.events ?? [])].sort((a, b) => a.time.getTime() - b.time.getTime());
  const canAssign = assignable.has(report.status);
  const canReview = report.status === 'completed';
  const assignLabel =
    report.status === 'assigned' || report.status === 'inProgress' ? 'Reassign team' : 'Assign team';

  const fail = (scope: Exclude<BusyAction, null>, title: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : 'Try again in a moment.';
    setActionError({ scope, message: alertCopy(title, detail) });
  };

  const assign = async () => {
    const deadline = endOfLocalDateInputIso(deadlineDate);
    if (!deadline) {
      setDateError(alertCopy('Choose a due date', 'Pick the calendar day this repair is due.'));
      return;
    }
    setDateError(null);
    setActionError(null);
    setBusy('assign');
    try {
      const updated = await reportStore.assignReport(report.id, {
        team,
        deadline,
        note: note.trim() ? note.trim() : null,
      });
      setDetail(updated);
    } catch (error) {
      fail('assign', 'Could not assign this report', error);
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setActionError(null);
    setBusy('verify');
    try {
      setDetail(await reportStore.verifyReport(report.id));
    } catch (error) {
      fail('verify', 'Could not verify this report', error);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setReasonError(alertCopy('Reason required', 'Tell the team what still needs to be fixed.'));
      return;
    }
    setReasonError(null);
    setActionError(null);
    setBusy('reject');
    try {
      setDetail(await reportStore.rejectReport(report.id, reason.trim()));
    } catch (error) {
      fail('reject', 'Could not send this back', error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell navigation={navigation} activeKey="Reports">
      <AuthBackdrop>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <ScreenContainer>
          <View style={isWide ? styles.split : undefined}>
            <View style={[styles.photoBox, isWide && styles.photoBoxWide]}>
              {report.photoUri ? (
                <PhotoWithBoundingBox
                  uri={report.photoUri}
                  boundingBox={report.boundingBox}
                  boundingBoxes={overlayBoxesForReport(report)}
                  height={isWide ? 360 : 240}
                />
              ) : (
                <View style={styles.photoEmpty}>
                  <Ionicons name="image-outline" size={40} color={colors.tealMid} />
                  <Text style={styles.photoHint}>No photo attached</Text>
                </View>
              )}
            </View>

            <View style={isWide ? styles.formCol : undefined}>
              <DetailRow label="Report ID" value={report.referenceId} selectable />
              <DetailRow label="City" value={report.city} />
              <DetailRow label="Area" value={report.area} />
              <DetailRow label="Road type" value={roadTypeLabels[report.roadType]} />
              <DetailRow label="Address" value={report.address.trim() || 'Not provided'} />
              {report.coords ? (
                <DetailRow
                  label="Coordinates"
                  value={`${report.coords.lat.toFixed(6)}, ${report.coords.lng.toFixed(6)}`}
                />
              ) : null}
              <DetailRow label="Confidence" value={`${report.confidence}%`} />

              <View style={styles.badgeRow}>
                <StatusBadge status={report.status} />
                {report.overdue ? <OverdueBadge /> : null}
              </View>
              <DetailRow label="Team" value={assignedTeamLabels[report.assignedTeam]} />
              {report.deadlineAt ? (
                <DetailRow label="Deadline" value={formatReportDateTime(report.deadlineAt)} />
              ) : null}
              {report.assignmentNote ? (
                <DetailRow label="Assign note" value={report.assignmentNote} />
              ) : null}
              {report.completionNote ? (
                <DetailRow label="Completion" value={report.completionNote} />
              ) : null}
              {report.completionPhotoUri ? (
                <Image source={{ uri: report.completionPhotoUri }} style={styles.completionPhoto} />
              ) : null}

              {flags.length > 0 ? (
                <View style={styles.flagBox}>
                  {flags.map((flag) => (
                    <Text key={flag} style={styles.flagText}>
                      {flag}
                    </Text>
                  ))}
                </View>
              ) : null}

              <LifetimePredictionCard report={report} />

              {canAssign ? (
                <View>
                  <Text style={styles.section}>
                    {report.status === 'assigned' || report.status === 'inProgress'
                      ? 'Reassign'
                      : 'Assign'}
                  </Text>
                  {report.status === 'assigned' || report.status === 'inProgress' ? (
                    <Text style={styles.hint}>
                      Reassigning returns this report to the new team's accept queue.
                    </Text>
                  ) : (
                    <Text style={styles.hint}>Choose a field team and the day the repair is due.</Text>
                  )}
                  <View style={styles.chips}>
                    {predefinedTeams.map((item) => (
                      <FilterChip
                        key={item}
                        label={assignedTeamLabels[item]}
                        selected={team === item}
                        onPress={() => setTeam(item)}
                      />
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Due date</Text>
                  <Text style={styles.hint}>Due at the end of the selected day.</Text>
                  <LocalDateField
                    value={deadlineDate}
                    error={dateError ?? undefined}
                    onChange={(value) => {
                      setDeadlineDate(value);
                      if (endOfLocalDateInputIso(value)) setDateError(null);
                    }}
                  />
                  <TextField
                    label="Note for the team (optional)"
                    value={note}
                    onChangeText={setNote}
                    icon="create-outline"
                    multiline
                  />
                  <TealButton
                    title={assignLabel}
                    onPress={assign}
                    loading={busy === 'assign'}
                    disabled={busy !== null}
                  />
                  {actionError?.scope === 'assign' ? (
                    <Text style={styles.inlineError}>{actionError.message}</Text>
                  ) : null}
                </View>
              ) : null}

              {canReview ? (
                <View>
                  <Text style={styles.section}>Verify repair</Text>
                  <Text style={styles.hint}>
                    The team marked this repair done. Verify it, or send it back with a reason.
                  </Text>
                  <TealButton
                    title="Verify and resolve"
                    onPress={verify}
                    loading={busy === 'verify'}
                    disabled={busy !== null}
                  />
                  {actionError?.scope === 'verify' ? (
                    <Text style={styles.inlineError}>{actionError.message}</Text>
                  ) : null}
                  <TextField
                    label="Reason to send back"
                    value={reason}
                    onChangeText={(text) => {
                      setReason(text);
                      if (text.trim()) setReasonError(null);
                    }}
                    error={reasonError ?? undefined}
                    icon="create-outline"
                    multiline
                  />
                  <OutlineButton
                    title={busy === 'reject' ? 'Sending back…' : 'Send back to team'}
                    onPress={reject}
                    disabled={busy !== null}
                  />
                  {actionError?.scope === 'reject' ? (
                    <Text style={styles.inlineError}>{actionError.message}</Text>
                  ) : null}
                </View>
              ) : null}

              {report.status === 'resolved' ? (
                <Text style={styles.hint}>This report is resolved. The activity history stays available.</Text>
              ) : null}

              <Text style={styles.section}>Activity</Text>
              {historyError ? <Text style={styles.hint}>{historyError}</Text> : null}
              {events.length === 0 ? (
                <Text style={styles.hint}>No activity recorded yet.</Text>
              ) : (
                events.map((event) => <ActivityRow key={event.id} event={event} />)
              )}
            </View>
          </View>
        </ScreenContainer>
      </ScrollView>
      </AuthBackdrop>
    </AdminShell>
  );
}

function LocalDateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateWrap}>
        <View style={[styles.dateField, !!error && styles.dateFieldError]}>
          {createElement('input', {
            type: 'date',
            value,
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            style: {
              border: 'none',
              outline: 'none',
              fontSize: 16,
              fontWeight: '700',
              color: colors.ink,
              backgroundColor: 'transparent',
              width: '100%',
              fontFamily: 'inherit',
            },
          })}
        </View>
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
    );
  }
  return (
    <TextField
      label="Due date (YYYY-MM-DD)"
      value={value}
      onChangeText={onChange}
      error={error}
      icon="calendar-outline"
      placeholder="YYYY-MM-DD"
    />
  );
}

function ActivityRow({ event }: { event: ReportEvent }) {
  const teamLabel = isTeamKey(event.team) ? assignedTeamLabels[event.team] : event.team;
  return (
    <View style={styles.activity}>
      <Text style={styles.activityTitle}>{reportEventLabels[event.type] ?? event.type}</Text>
      <Text style={styles.activityMeta}>
        {formatReportDateTime(event.time)}
        {event.actor ? ` · ${event.actor}` : ''}
      </Text>
      {teamLabel ? <Text style={styles.activityMeta}>{teamLabel}</Text> : null}
      {event.deadlineAt ? (
        <Text style={styles.activityMeta}>Due {formatReportDateTime(event.deadlineAt)}</Text>
      ) : null}
      {event.note ? <Text style={styles.activityNote}>{event.note}</Text> : null}
      {event.photoUrl ? <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} /> : null}
    </View>
  );
}

function DetailRow({
  label,
  value,
  selectable,
}: {
  label: string;
  value: string;
  selectable?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable={selectable}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },
  photoBoxWide: {
    flex: 1,
    height: 320,
    marginBottom: 0,
  },
  formCol: {
    flex: 1,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingText: {
    color: colors.muted,
  },
  photoBox: {
    height: 210,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.tealLight,
    marginBottom: 20,
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    marginTop: 8,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  rowLabel: {
    width: 120,
    color: colors.muted,
  },
  rowValue: {
    flex: 1,
    fontWeight: '700',
    color: colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  flagBox: {
    backgroundColor: '#FFF6E8',
    borderRadius: radii.button,
    padding: 12,
    marginBottom: 8,
  },
  flagText: {
    color: colors.pillOrange,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  hint: {
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  dateWrap: {
    marginBottom: 18,
  },
  dateField: {
    minHeight: 56,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dateFieldError: {
    borderColor: colors.pillRed,
  },
  fieldError: {
    marginTop: 6,
    marginLeft: 4,
    color: colors.pillRed,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineError: {
    marginTop: 8,
    marginBottom: 4,
    color: colors.pillRed,
    fontSize: 13,
    lineHeight: 18,
  },
  completionPhoto: {
    width: '100%',
    height: 180,
    borderRadius: radii.card,
    marginBottom: 12,
    backgroundColor: colors.tealLight,
  },
  activity: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  activityTitle: {
    fontWeight: '800',
    color: colors.ink,
  },
  activityMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
  activityNote: {
    marginTop: 8,
    color: colors.ink,
    lineHeight: 20,
  },
  eventPhoto: {
    marginTop: 10,
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.tealLight,
  },
});
