import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TealButton } from '../components/Buttons';
import { FilterChip } from '../components/FilterChip';
import { reportStore, useReports } from '../data/reportStore';
import { AdminShell } from '../layout/AdminShell';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  adminUiStatusLabels,
  adminUiStatuses,
  assignedTeamLabels,
  formatReportDate,
  fromAdminUiStatus,
  isIncompleteLocation,
  isLowConfidence,
  predefinedTeams,
  predictLifetime,
  roadTypeLabels,
  toAdminUiStatus,
  type AdminUiStatus,
  type AssignedTeam,
} from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReportDetail'>;

export function AdminReportDetailScreen({ navigation, route }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const report = reports.find((item) => item.id === route.params.reportId);

  const initialTeam = useMemo<AssignedTeam>(() => {
    if (!report || report.assignedTeam === 'unassigned') return 'roadMaintenance';
    return report.assignedTeam;
  }, [report]);

  const [team, setTeam] = useState<AssignedTeam>(initialTeam);
  const [uiStatus, setUiStatus] = useState<AdminUiStatus>(
    report ? toAdminUiStatus(report.status) : 'pending',
  );

  if (!report) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This report is no longer available.</Text>
      </View>
    );
  }

  const lifetime = predictLifetime(report);
  const flags = [
    isIncompleteLocation(report) ? 'Incomplete location' : null,
    isLowConfidence(report) ? 'Low detection confidence' : null,
  ].filter(Boolean) as string[];

  const save = () => {
    reportStore.updateAssignment(report.id, team, fromAdminUiStatus(uiStatus, team));
    Alert.alert('Assignment updated.', undefined, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <AdminShell navigation={navigation} activeKey="Reports">
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <ScreenContainer>
          <View style={isWide ? styles.split : undefined}>
            <View style={[styles.photoBox, isWide && styles.photoBoxWide]}>
              {report.photoUri ? (
                <Image source={{ uri: report.photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoEmpty}>
                  <Ionicons name="image-outline" size={40} color={colors.tealMid} />
                  <Text style={styles.photoHint}>No photo attached</Text>
                </View>
              )}
            </View>

            <View style={isWide ? styles.formCol : undefined}>
              <DetailRow label="City" value={report.city} />
              <DetailRow label="Area" value={report.area} />
              <DetailRow label="Road type" value={roadTypeLabels[report.roadType]} />
              <DetailRow
                label="Address"
                value={report.address.trim() || 'Not provided'}
              />
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

              <View style={styles.lifetime}>
                <Text style={styles.lifeTitle}>Pothole lifetime prediction</Text>
                <Text style={styles.lifeValue}>{lifetime.daysUntilCritical} days until critical</Text>
                <Text style={styles.lifeMeta}>
                  Recommended repair deadline: {formatReportDate(lifetime.deadline)}
                </Text>
                <Text style={styles.lifeNote}>{lifetime.urgency}</Text>
              </View>

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

              <TealButton title="Save assignment" onPress={save} style={styles.save} />
            </View>
          </View>
        </ScreenContainer>
      </ScrollView>
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  lifetime: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
    ...shadows.card,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  lifeTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  lifeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.teal,
  },
  lifeMeta: {
    marginTop: 6,
    fontWeight: '600',
    color: colors.ink,
  },
  lifeNote: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
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
