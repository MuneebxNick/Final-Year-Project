import { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { uploadReportPhoto } from '../api/cloudinary';
import { OutlineButton, TealButton } from '../components/Buttons';
import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { SeverityBadge } from '../components/SeverityBadge';
import { OverdueBadge, StatusBadge } from '../components/StatusBadge';
import { TextField } from '../components/TextField';
import { reportStore, useReportsHydrated, useTeamReports } from '../data/reportStore';
import { AuthBackdrop } from '../layout/AuthBackdrop';
import { ScreenContainer } from '../layout/ScreenContainer';
import { TeamShell } from '../layout/TeamShell';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  formatReportDateTime,
  roadTypeLabels,
  severityColors,
  type OverlayBox,
  type TeamReport,
} from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamReportDetail'>;
type BusyAction = 'accept' | 'complete' | 'escalate' | null;
type ActionScope = Exclude<BusyAction, null>;

function alertCopy(title: string, message?: string): string {
  if (!message || message === title) return title;
  return `${title}\n${message}`;
}

function mapsUrl(report: Pick<TeamReport, 'coords' | 'address'>): string | null {
  if (report.coords) {
    return `https://www.google.com/maps/search/?api=1&query=${report.coords.lat},${report.coords.lng}`;
  }
  const address = report.address.trim();
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function TeamReportDetailScreen({ navigation, route }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useTeamReports();
  const hydrated = useReportsHydrated();
  const listed = reports.find((item) => item.id === route.params.reportId);
  const [detail, setDetail] = useState<TeamReport | null>(null);
  const [missing, setMissing] = useState(false);
  const report = detail ?? listed ?? null;

  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ scope: ActionScope; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<BusyAction>(null);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    void reportStore.loadTeamReport(route.params.reportId).then(
      (next) => {
        if (!cancelled) setDetail(next);
      },
      () => {
        if (!cancelled) setMissing(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [route.params.reportId]);

  if (!report && !hydrated && !missing) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Loading report…</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This report is no longer in your queue.</Text>
      </View>
    );
  }

  const boxes: OverlayBox[] = report.boundingBoxes?.length
    ? report.boundingBoxes
    : [{ ...report.boundingBox, severity: report.severity }];
  const mapLink = mapsUrl(report);
  const canAccept = report.status === 'assigned';
  const canWork = report.status === 'inProgress';
  const canEscalate = canAccept || canWork;

  const fail = (scope: ActionScope, title: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : 'Try again in a moment.';
    setActionError({ scope, message: alertCopy(title, detail) });
  };

  const openMaps = () => {
    if (!mapLink) return;
    setMapsError(null);
    void Linking.openURL(mapLink).catch(() => {
      setMapsError(alertCopy('Could not open Maps', 'Try again in a moment.'));
    });
  };

  const rememberPhoto = (uri: string) => {
    setPhotoUri(uri);
    setPhotoError(null);
    setPhotoNotice(null);
  };

  const pick = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setPhotoNotice(
            alertCopy('Camera needed', 'Allow camera access to photograph the finished repair.'),
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
        if (!result.canceled && result.assets[0]) rememberPhoto(result.assets[0].uri);
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoNotice(
          alertCopy('Photos needed', 'Allow photo library access to attach a completion photo.'),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) rememberPhoto(result.assets[0].uri);
    } catch {
      setPhotoNotice('Could not open the camera or gallery.');
    }
  };

  const accept = async () => {
    setActionError(null);
    setBusy('accept');
    try {
      setDetail(await reportStore.acceptTeam(report.id));
    } catch (error) {
      fail('accept', 'Could not accept this report', error);
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    const photo = photoUri;
    const missingPhoto = !photo;
    const missingNote = !note.trim();
    setPhotoError(missingPhoto ? 'Photo required' : null);
    setNoteError(missingNote ? 'Note required' : null);
    if (!photo || missingNote) return;
    setActionError(null);
    setBusy('complete');
    try {
      const uploaded = await uploadReportPhoto(photo);
      const updated = await reportStore.completeTeam(report.id, {
        photoUri: uploaded.photoUri,
        photoPublicId: uploaded.photoPublicId,
        note: note.trim(),
      });
      setDetail(updated);
      setPhotoUri(null);
      setNote('');
    } catch (error) {
      fail('complete', 'Could not mark this complete', error);
    } finally {
      setBusy(null);
    }
  };

  const escalate = async () => {
    if (!reason.trim()) {
      setReasonError('Explain why this report needs another look.');
      return;
    }
    setReasonError(null);
    setActionError(null);
    setBusy('escalate');
    try {
      await reportStore.escalateTeam(report.id, reason.trim());
      navigation.navigate('TeamTabs', { screen: 'Queue' });
    } catch (error) {
      fail('escalate', 'Could not escalate this report', error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <TeamShell navigation={navigation} activeKey="Queue">
      <AuthBackdrop>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
          <ScreenContainer>
            <View style={isWide ? styles.split : undefined}>
              <View style={isWide ? styles.left : undefined}>
                <PhotoWithBoundingBox
                  uri={report.photoUri}
                  boundingBox={report.boundingBox}
                  boundingBoxes={boxes}
                  height={isWide ? 360 : 240}
                />
                <View style={styles.potholeList}>
                  {boxes.map((pothole, index) => (
                    <View key={`${pothole.left}-${pothole.top}-${index}`} style={styles.potholeRow}>
                      <View
                        style={[styles.potholeIndex, { backgroundColor: severityColors[pothole.severity] }]}
                      >
                        <Text style={styles.potholeIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.potholeMeta}>
                        <Text style={styles.metaLabel}>Pothole {index + 1}</Text>
                        <SeverityBadge severity={pothole.severity} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View style={isWide ? styles.right : undefined}>
                {report.rejectionReason ? (
                  <View style={styles.rejection}>
                    <Text style={styles.rejectionTitle}>Sent back by admin</Text>
                    <Text style={styles.rejectionReason}>{report.rejectionReason}</Text>
                  </View>
                ) : null}
                <View style={styles.badgeRow}>
                  <StatusBadge status={report.status} />
                  {report.overdue ? <OverdueBadge /> : null}
                </View>
                <Detail label="Report ID" value={report.referenceId} selectable />
                <Detail label="City" value={report.city} />
                <Detail label="Area" value={report.area} />
                <Detail label="Road type" value={roadTypeLabels[report.roadType]} />
                <Detail label="Address" value={report.address.trim() || 'Not provided'} />
                {report.coords ? (
                  <Detail
                    label="Coordinates"
                    value={`${report.coords.lat.toFixed(6)}, ${report.coords.lng.toFixed(6)}`}
                  />
                ) : null}
                {report.landmark ? <Detail label="Landmark" value={report.landmark} /> : null}
                {report.description ? <Detail label="Description" value={report.description} /> : null}
                {report.deadlineAt ? (
                  <Detail label="Deadline" value={formatReportDateTime(report.deadlineAt)} />
                ) : null}
                {report.assignmentNote ? <Detail label="Assignment note" value={report.assignmentNote} /> : null}
                {mapLink ? <OutlineButton title="Open in Maps" onPress={openMaps} style={styles.action} /> : null}
                {mapsError ? <Text style={styles.inlineError}>{mapsError}</Text> : null}

                {report.completionPhotoUri ? (
                  <Image source={{ uri: report.completionPhotoUri }} style={styles.completionPhoto} />
                ) : null}
                {report.completionNote ? <Detail label="Completion note" value={report.completionNote} /> : null}

                {canAccept ? (
                  <TealButton
                    title="Accept"
                    onPress={accept}
                    loading={busy === 'accept'}
                    disabled={busy !== null}
                    style={styles.action}
                  />
                ) : null}
                {actionError?.scope === 'accept' ? (
                  <Text style={styles.inlineError}>{actionError.message}</Text>
                ) : null}

                {canWork ? (
                  <View style={styles.block}>
                    <Text style={styles.section}>Complete repair</Text>
                    <View style={styles.photoActions}>
                      <OutlineButton title="Take photo" onPress={() => void pick('camera')} />
                      <OutlineButton title="Choose photo" onPress={() => void pick('library')} />
                    </View>
                    {photoUri ? <Image source={{ uri: photoUri }} style={styles.completionPhoto} /> : (
                      <View style={styles.photoEmpty}>
                        <Ionicons name="camera-outline" size={28} color={colors.tealMid} />
                        <Text style={styles.photoHint}>Add a photo of the finished repair</Text>
                      </View>
                    )}
                    {photoError ? <Text style={styles.inlineError}>{photoError}</Text> : null}
                    {photoNotice ? <Text style={styles.inlineError}>{photoNotice}</Text> : null}
                    <TextField
                      label="What did you repair?"
                      value={note}
                      onChangeText={(text) => {
                        setNote(text);
                        if (text.trim()) setNoteError(null);
                      }}
                      error={noteError ?? undefined}
                      icon="create-outline"
                      multiline
                    />
                    <TealButton
                      title="Mark complete"
                      onPress={complete}
                      loading={busy === 'complete'}
                      disabled={busy !== null}
                    />
                    {actionError?.scope === 'complete' ? (
                      <Text style={styles.inlineError}>{actionError.message}</Text>
                    ) : null}
                  </View>
                ) : null}

                {canEscalate ? (
                  <View style={styles.block}>
                    <Text style={styles.section}>Escalate</Text>
                    <TextField
                      label="Reason"
                      value={reason}
                      onChangeText={(text) => {
                        setReason(text);
                        if (text.trim()) setReasonError(null);
                      }}
                      error={reasonError ?? undefined}
                      icon="alert-circle-outline"
                      multiline
                    />
                    <OutlineButton
                      title={busy === 'escalate' ? 'Escalating…' : 'Escalate'}
                      onPress={escalate}
                      disabled={busy !== null}
                    />
                    {actionError?.scope === 'escalate' ? (
                      <Text style={styles.inlineError}>{actionError.message}</Text>
                    ) : null}
                  </View>
                ) : null}

                {report.status === 'completed' ? (
                  <Text style={styles.hint}>Waiting for an admin to verify this repair.</Text>
                ) : null}
                {report.status === 'resolved' ? (
                  <Text style={styles.hint}>This repair is done.</Text>
                ) : null}
              </View>
            </View>
          </ScreenContainer>
        </ScrollView>
      </AuthBackdrop>
    </TeamShell>
  );
}

function Detail({
  label,
  value,
  selectable,
}: {
  label: string;
  value: string;
  selectable?: boolean;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable={selectable}>
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
  left: {
    flex: 1.05,
  },
  right: {
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
  rejection: {
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: '#FDECEC',
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  rejectionTitle: {
    color: colors.pillRed,
    fontWeight: '800',
    fontSize: 15,
  },
  rejectionReason: {
    color: colors.ink,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  potholeList: {
    marginTop: 16,
    gap: 10,
  },
  potholeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
  },
  potholeIndex: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potholeIndexText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  potholeMeta: {
    flex: 1,
  },
  metaLabel: {
    color: colors.muted,
    marginBottom: 4,
    fontSize: 12,
  },
  detail: {
    marginBottom: 10,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  detailValue: {
    marginTop: 2,
    fontWeight: '700',
    color: colors.ink,
  },
  action: {
    marginTop: 8,
    marginBottom: 8,
  },
  block: {
    marginTop: 16,
  },
  section: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoEmpty: {
    height: 120,
    borderRadius: radii.card,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoHint: {
    marginTop: 6,
    color: colors.muted,
  },
  completionPhoto: {
    width: '100%',
    height: 180,
    borderRadius: radii.card,
    marginBottom: 12,
    backgroundColor: colors.tealLight,
  },
  hint: {
    marginTop: 12,
    color: colors.muted,
    lineHeight: 20,
  },
  inlineError: {
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 4,
    color: colors.pillRed,
    fontSize: 13,
    lineHeight: 18,
  },
});
