import { useSyncExternalStore } from 'react';

import {
  timelineFor,
  type AssignedTeam,
  type Report,
  type ReportStatus,
} from '../models/report';

type Listener = () => void;

let formResetPending = false;

export function markFormReset() {
  formResetPending = true;
}

export function consumeFormReset() {
  const pending = formResetPending;
  formResetPending = false;
  return pending;
}

function daysAgo(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);
}

function seedReports(): Report[] {
  return [
    {
      id: 'seed-1',
      photoUri: null,
      city: 'Lahore',
      area: 'DHA Phase 5, Sector Y',
      roadType: 'highway',
      status: 'pending',
      assignedTeam: 'unassigned',
      createdAt: daysAgo(0, 2),
      severity: 'medium',
      confidence: 86,
      address: 'Main Boulevard, DHA Phase 5',
      landmark: 'Near Dunkin Donuts',
      description: 'Wide pothole on the left lane after the U-turn.',
      coords: { lat: 31.4696, lng: 74.412 },
      boundingBox: { left: 22, top: 32, width: 48, height: 30 },
      timelineStage: 'submitted',
    },
    {
      id: 'seed-2',
      photoUri: null,
      city: 'Karachi',
      area: 'Gulshan-e-Iqbal, Block 13-D',
      roadType: 'localRoad',
      status: 'assigned',
      assignedTeam: 'roadMaintenance',
      createdAt: daysAgo(1, 4),
      severity: 'large',
      confidence: 91,
      address: 'University Road, Block 13-D',
      landmark: 'Opposite Disco Bakery',
      coords: { lat: 24.9263, lng: 67.088 },
      boundingBox: { left: 18, top: 28, width: 52, height: 34 },
      timelineStage: 'repairAssigned',
    },
    {
      id: 'seed-3',
      photoUri: null,
      city: 'Rawalpindi',
      area: 'Saddar, The Mall',
      roadType: 'serviceRoad',
      status: 'inProgress',
      assignedTeam: 'emergencyRepair',
      createdAt: daysAgo(2),
      severity: 'small',
      confidence: 78,
      address: 'The Mall, service lane beside Committee Chowk',
      landmark: 'Near Holy Family Hospital turn',
      coords: { lat: 33.5974, lng: 73.0479 },
      boundingBox: { left: 28, top: 36, width: 38, height: 26 },
      timelineStage: 'inProgress',
    },
    {
      id: 'seed-4',
      photoUri: null,
      city: 'Lahore',
      area: 'Johar Town, Block H',
      roadType: 'highway',
      status: 'resolved',
      assignedTeam: 'inspection',
      createdAt: daysAgo(5),
      severity: 'medium',
      confidence: 83,
      address: 'Canal Bank Road near Kalma Chowk',
      landmark: 'Beside Expo Centre approach',
      description: 'Fixed after monsoon damage.',
      coords: { lat: 31.4706, lng: 74.2728 },
      boundingBox: { left: 20, top: 30, width: 44, height: 28 },
      timelineStage: 'resolved',
    },
    {
      id: 'seed-5',
      photoUri: null,
      city: 'Lahore',
      area: 'DHA Phase 5, Sector Y',
      roadType: 'highway',
      status: 'pending',
      assignedTeam: 'unassigned',
      createdAt: daysAgo(8),
      severity: 'large',
      confidence: 68,
      address: '',
      landmark: 'Near Phase 5 commercial belt',
      description: 'Citizen could not pin a precise location.',
      boundingBox: { left: 24, top: 34, width: 46, height: 32 },
      timelineStage: 'submitted',
    },
    {
      id: 'seed-6',
      photoUri: null,
      city: 'Karachi',
      area: 'Gulshan-e-Iqbal, Block 13-D',
      roadType: 'localRoad',
      status: 'inProgress',
      assignedTeam: 'roadMaintenance',
      createdAt: daysAgo(12),
      severity: 'medium',
      confidence: 88,
      address: 'Rashid Minhas Road feeder',
      landmark: 'Beside NIPA flyover ramp',
      coords: { lat: 24.9218, lng: 67.0941 },
      boundingBox: { left: 16, top: 26, width: 50, height: 30 },
      timelineStage: 'inProgress',
    },
    {
      id: 'seed-7',
      photoUri: null,
      city: 'Rawalpindi',
      area: 'Satellite Town, Block B',
      roadType: 'localRoad',
      status: 'pending',
      assignedTeam: 'unassigned',
      createdAt: daysAgo(15),
      severity: 'large',
      confidence: 71,
      address: 'Sixth Road near Chandni Chowk',
      landmark: 'Opposite commercial market',
      coords: { lat: 33.6261, lng: 73.0715 },
      boundingBox: { left: 20, top: 30, width: 54, height: 36 },
      timelineStage: 'underReview',
    },
    {
      id: 'seed-8',
      photoUri: null,
      city: 'Lahore',
      area: 'Gulberg III, MM Alam',
      roadType: 'serviceRoad',
      status: 'inProgress',
      assignedTeam: 'emergencyRepair',
      createdAt: daysAgo(18),
      severity: 'small',
      confidence: 90,
      address: 'MM Alam Road service lane',
      landmark: 'Near Packages Mall signal',
      coords: { lat: 31.5208, lng: 74.3516 },
      boundingBox: { left: 30, top: 38, width: 36, height: 24 },
      timelineStage: 'inProgress',
    },
    {
      id: 'seed-9',
      photoUri: null,
      city: 'Karachi',
      area: 'Korangi, Sector 31',
      roadType: 'highway',
      status: 'resolved',
      assignedTeam: 'inspection',
      createdAt: daysAgo(22),
      severity: 'medium',
      confidence: 64,
      address: 'Korangi Industrial Road',
      landmark: 'Beside Landhi interchange',
      boundingBox: { left: 18, top: 28, width: 48, height: 32 },
      timelineStage: 'resolved',
    },
    {
      id: 'seed-10',
      photoUri: null,
      city: 'Lahore',
      area: 'Cantt, Tufail Road',
      roadType: 'highway',
      status: 'assigned',
      assignedTeam: 'emergencyRepair',
      createdAt: daysAgo(26),
      severity: 'large',
      confidence: 92,
      address: 'Tufail Road near Fortress Stadium',
      landmark: 'Opposite polo ground gate',
      coords: { lat: 31.524, lng: 74.384 },
      boundingBox: { left: 14, top: 24, width: 56, height: 38 },
      timelineStage: 'repairAssigned',
    },
    {
      id: 'seed-11',
      photoUri: null,
      city: 'Karachi',
      area: 'Saddar, Zaibunissa Street',
      roadType: 'localRoad',
      status: 'pending',
      assignedTeam: 'unassigned',
      createdAt: daysAgo(30),
      severity: 'small',
      confidence: 81,
      address: '',
      description: 'Photo submitted without a street address.',
      boundingBox: { left: 26, top: 34, width: 40, height: 28 },
      timelineStage: 'submitted',
    },
    {
      id: 'seed-12',
      photoUri: null,
      city: 'Rawalpindi',
      area: 'Bahria Town, Phase 8',
      roadType: 'serviceRoad',
      status: 'resolved',
      assignedTeam: 'roadMaintenance',
      createdAt: daysAgo(35),
      severity: 'medium',
      confidence: 79,
      address: 'Bahria Phase 8 boulevard',
      landmark: 'Near Safari Valley gate',
      coords: { lat: 33.542, lng: 73.126 },
      boundingBox: { left: 22, top: 32, width: 42, height: 26 },
      timelineStage: 'resolved',
    },
  ];
}

class ReportStore {
  private reports: Report[] = seedReports();
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getReports = () => this.reports;

  byId(id: string): Report | undefined {
    return this.reports.find((report) => report.id === id);
  }

  add(report: Report) {
    this.reports = [report, ...this.reports];
    this.notify();
  }

  updateAssignment(id: string, team: AssignedTeam, status: ReportStatus) {
    const current = this.byId(id);
    if (!current) return;
    this.reports = this.reports.map((report) =>
      report.id === id
        ? { ...report, assignedTeam: team, status, timelineStage: timelineFor(status) }
        : report,
    );
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const reportStore = new ReportStore();

export function useReports(): Report[] {
  return useSyncExternalStore(reportStore.subscribe, reportStore.getReports);
}
