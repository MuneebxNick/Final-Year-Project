import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PhotoWithBoundingBox } from '../components/PhotoWithBoundingBox';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useReports } from '../data/reportStore';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import {
  formatReportDate,
  roadTypeLabels,
  timelineStageLabels,
  timelineStages,
  type TimelineStage,
} from '../models/report';
import type { RootStackParamList } from '../navigation';
import { colors, radii, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UserReportDetail'>;

export function UserReportDetailScreen({ route }: Props) {
  const { isWide } = useBreakpoint();
  const reports = useReports();
  const report = reports.find((item) => item.id === route.params.reportId);

  if (!report) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This report is no longer available.</Text>
      </View>
    );
  }

  const currentIndex = timelineStages.indexOf(report.timelineStage);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <ScreenContainer>
      <View style={isWide ? styles.split : undefined}>
      <View style={isWide ? styles.left : undefined}>
      <PhotoWithBoundingBox
        uri={report.photoUri}
        boundingBox={report.boundingBox}
        height={isWide ? 360 : 240}
      />

      <View style={styles.badges}>
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} variant="user" />
      </View>

      <Text style={styles.confidence}>Confidence {report.confidence}%</Text>
      <Text style={styles.date}>Submitted {formatReportDate(report.createdAt)}</Text>
      </View>

      <View style={isWide ? styles.right : undefined}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>
        <Detail label="City" value={report.city} />
        <Detail label="Area" value={report.area} />
        <Detail label="Road type" value={roadTypeLabels[report.roadType]} />
        <Detail label="Address" value={report.address} />
        {report.landmark ? <Detail label="Landmark" value={report.landmark} /> : null}
        {report.description ? <Detail label="Description" value={report.description} /> : null}
        {report.coords ? (
          <Detail
            label="Coordinates"
            value={`${report.coords.lat.toFixed(4)}, ${report.coords.lng.toFixed(4)}`}
          />
        ) : null}
      </View>

      <Text style={styles.cardTitle}>Status timeline</Text>
      <View style={styles.timeline}>
        {timelineStages.map((stage, index) => (
          <TimelineStep
            key={stage}
            stage={stage}
            index={index}
            currentIndex={currentIndex}
            isLast={index === timelineStages.length - 1}
          />
        ))}
      </View>
      </View>
      </View>
      </ScreenContainer>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TimelineStep({
  stage,
  index,
  currentIndex,
  isLast,
}: {
  stage: TimelineStage;
  index: number;
  currentIndex: number;
  isLast: boolean;
}) {
  const done = index < currentIndex;
  const current = index === currentIndex;
  const upcoming = index > currentIndex;

  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            done && styles.dotDone,
            current && styles.dotCurrent,
            upcoming && styles.dotUpcoming,
          ]}
        />
        {isLast ? null : (
          <View style={[styles.line, (done || current) && styles.lineOn]} />
        )}
      </View>
      <View style={styles.stepBody}>
        <Text
          style={[
            styles.stepLabel,
            current && styles.stepCurrent,
            upcoming && styles.stepUpcoming,
          ]}
        >
          {timelineStageLabels[stage]}
        </Text>
        {current ? <Text style={styles.now}>Current</Text> : null}
      </View>
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
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  confidence: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    color: colors.teal,
  },
  date: {
    marginTop: 4,
    color: colors.muted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
    ...shadows.card,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
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
  timeline: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows.card,
  },
  step: {
    flexDirection: 'row',
    minHeight: 52,
  },
  rail: {
    width: 22,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  dotDone: {
    backgroundColor: colors.tealMid,
    borderColor: colors.tealMid,
  },
  dotCurrent: {
    backgroundColor: colors.blueMid,
    borderColor: colors.blueMid,
  },
  dotUpcoming: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  lineOn: {
    backgroundColor: colors.tealMid,
  },
  stepBody: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepLabel: {
    fontWeight: '700',
    color: colors.ink,
  },
  stepCurrent: {
    color: colors.blue,
  },
  stepUpcoming: {
    color: colors.muted,
    fontWeight: '600',
  },
  now: {
    marginTop: 2,
    fontSize: 12,
    color: colors.blue,
    fontWeight: '600',
  },
});
