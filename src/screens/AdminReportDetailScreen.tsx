import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TealButton } from '../components/Buttons';
import { FilterChip } from '../components/FilterChip';
import { LifetimePredictionCard } from '../components/LifetimePredictionCard';
import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { reportStore, useReports, useReportsHydrated } from '../data/reportStore';
import { AdminShell } from '../layout/AdminShell';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  adminUiStatusLabels,
  adminUiStatuses,
  assignedTeamLabels,
  isIncompleteLocation,
  isLowConfidence,
  overlayBoxesForReport,
  predefinedTeams,
  roadTypeLabels,
  toAdminUiStatus,
  type AdminUiStatus,
  type AssignedTeam,
} from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReportDetail'>;

export function AdminReportDetailScreen({ navigation, route }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const hydrated = useReportsHydrated();
  const report = reports.find((item) => item.id === route.params.reportId);

  const initialTeam = useMemo<AssignedTeam>(() => {
    if (!report || report.assignedTeam === 'unassigned') return 'roadMaintenance';
    return report.assignedTeam;
  }, [report]);

  const [team, setTeam] = useState<AssignedTeam>(initialTeam);
  const [uiStatus, setUiStatus] = useState<AdminUiStatus>(
    report ? toAdminUiStatus(report.status) : 'pending',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!report) return;
    setTeam(report.assignedTeam === 'unassigned' ? 'roadMaintenance' : report.assignedTeam);
    setUiStatus(toAdminUiStatus(report.status));
  }, [report?.id]);

  if (!hydrated) {
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

  const save = async () => {
    setSaving(true);
    try {
      await reportStore.updateAssignment(report.id, team, uiStatus);
      navigation.navigate('AdminTabs', { screen: 'Reports' });
    } catch (error) {
      Alert.alert(
        'Could not save assignment',
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell navigation={navigation} activeKey="Reports">
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
              <DetailRow
                label="Address"
                value={report.address.trim() || 'Not provided'}
              />
              {report.coords ? (
                <DetailRow
                  label="Coordinates"
                  value={`${report.coords.lat.toFixed(6)}, ${report.coords.lng.toFixed(6)}`}
                />
              ) : null}
              <DetailRow label="Confidence" value={`${report.confidence}%`} />

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

              <Text style={styles.section}>Status</Text>
              <View style={styles.chips}>
                {adminUiStatuses.map((item) => (
                  <FilterChip
                    key={item}
                    label={adminUiStatusLabels[item]}
                    selected={uiStatus === item}
                    onPress={() => setUiStatus(item)}
                  />
                ))}
              </View>

              <Text style={styles.section}>Assign team</Text>
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

              <TealButton title="Save assignment" onPress={save} style={styles.save} loading={saving} />
            </View>
          </View>
        </ScreenContainer>
      </ScrollView>
    </AdminShell>
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
  photo: {
    width: '100%',
    height: '100%',
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  save: {
    marginTop: 28,
  },
});
