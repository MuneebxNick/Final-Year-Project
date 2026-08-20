import type { NavigatorScreenParams } from '@react-navigation/native';

import type { DetectionDraft } from './models/report';

export type UserTabParamList = {
  Home: undefined;
  Report: undefined;
  MyReports: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Reports: undefined;
  Map: undefined;
  Predictive: undefined;
};

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Signup: undefined;
  UserTabs: NavigatorScreenParams<UserTabParamList> | undefined;
  DetectionResult: { draft: DetectionDraft };
  UserReportDetail: { reportId: string };
  AdminLogin: undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  AdminReportDetail: { reportId: string };
};
