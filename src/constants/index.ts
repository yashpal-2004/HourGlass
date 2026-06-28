import type { Day, TimeSlot } from '../types';

export const DEFAULT_DAYS: Day[] = [
  { id: 'mon', name: 'Monday' },
  { id: 'tue', name: 'Tuesday' },
  { id: 'wed', name: 'Wednesday' },
  { id: 'thu', name: 'Thursday' },
  { id: 'fri', name: 'Friday' },
  { id: 'sat', name: 'Saturday' },
  { id: 'sun', name: 'Sunday' },
];

export const DEFAULT_SLOTS: TimeSlot[] = [
  { id: 's1', startTime: '00:00', endTime: '01:00' },
  { id: 's2', startTime: '01:00', endTime: '02:00' },
  { id: 's3', startTime: '02:00', endTime: '03:00' },
  { id: 's4', startTime: '03:00', endTime: '04:00' },
  { id: 's5', startTime: '04:00', endTime: '05:00' },
  { id: 's6', startTime: '05:00', endTime: '06:00' },
  { id: 's7', startTime: '06:00', endTime: '07:00' },
  { id: 's8', startTime: '07:00', endTime: '08:00' },
  { id: 's9a', startTime: '08:00', endTime: '08:30' },
  { id: 's9b', startTime: '08:30', endTime: '09:00' },
  { id: 's10', startTime: '09:00', endTime: '10:00' },
  { id: 's11', startTime: '10:00', endTime: '11:00' },
  { id: 's12', startTime: '11:00', endTime: '12:00' },
  { id: 's13', startTime: '12:00', endTime: '13:00' },
  { id: 's14', startTime: '13:00', endTime: '14:00' },
  { id: 's15', startTime: '14:00', endTime: '15:00' },
  { id: 's16', startTime: '15:00', endTime: '16:00' },
  { id: 's17', startTime: '16:00', endTime: '17:00' },
  { id: 's18', startTime: '17:00', endTime: '18:00' },
  { id: 's19', startTime: '18:00', endTime: '19:00' },
  { id: 's20', startTime: '19:00', endTime: '20:00' },
  { id: 's21', startTime: '20:00', endTime: '21:00' },
  { id: 's22', startTime: '21:00', endTime: '22:00' },
  { id: 's23', startTime: '22:00', endTime: '23:00' },
  { id: 's24', startTime: '23:00', endTime: '00:00' },
];

export const PASTEL_COLORS = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  purple: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  red: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  gray: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
};

export const AVAILABLE_ICONS = [
  'BookOpen', 'Laptop', 'Users', 'Compass', 'Dumbbell', 'Briefcase',
  'FileText', 'Calendar', 'Music', 'Layers', 'Coffee', 'CheckSquare',
  'Activity', 'TrendingUp', 'Award', 'Globe', 'Map', 'Terminal',
];

/** Kept for backward-compat with old imports (`pastelColors`, `availableIcons`). */
export const pastelColors = PASTEL_COLORS;
export const availableIcons = AVAILABLE_ICONS;
