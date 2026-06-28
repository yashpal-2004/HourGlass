export interface Day {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface TimetableCell {
  id: string; // slotId + '-' + dayId  (or slotId + '-' + dayId + '-' + YYYY-MM-DD for date-specific)
  slotId: string;
  dayId: string;
  subject: string;
  teacher: string;
  room: string;
  notes: string;
  color: string; // pastel color theme name (e.g., 'blue', 'purple')
  iconName: string; // Lucide icon identifier
  categoryType?: 'academic' | 'study' | 'routine' | 'waste';
  eventStartTime?: string;
  eventEndTime?: string;
  dateKey?: string; // YYYY-MM-DD — when set, this cell applies only to that specific date
}

export interface SavedProject {
  id: string;
  name: string;
  slots: TimeSlot[];
  days: Day[];
  cells: Record<string, TimetableCell>;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  slots: TimeSlot[];
  days: Day[];
  cells: Record<string, TimetableCell>;
}

export interface TimetableStats {
  totalHours: number;
  subjectCount: number;
  freeTimeHours: number;
  busyHours: number;
}
