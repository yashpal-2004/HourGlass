import type { Template, TimetableCell } from '../types';
import { DEFAULT_DAYS, DEFAULT_SLOTS, PASTEL_COLORS, AVAILABLE_ICONS } from '../constants';

// Re-export for components that still import these from utils/templates
export const pastelColors = PASTEL_COLORS;
export const availableIcons = AVAILABLE_ICONS;

// Complete day routine template with subjects replaced with AML, Deep Learning, and OS
const completeDayCells: Record<string, TimetableCell> = {};

DEFAULT_DAYS.forEach(day => {
  // Morning routine (07:00 - 08:00)
  const hiitId = `s8-${day.id}`;
  if (day.id === 'sat') {
    completeDayCells[hiitId] = { id: hiitId, slotId: 's8', dayId: day.id, subject: 'Active Recovery', teacher: 'Self', room: 'Pool', notes: 'Swimming', color: 'blue', iconName: 'Coffee', categoryType: 'routine' };
  } else if (day.id === 'sun') {
    completeDayCells[hiitId] = { id: hiitId, slotId: 's8', dayId: day.id, subject: 'Rest Day', teacher: 'Self', room: 'Home', notes: 'Lazy morning', color: 'gray', iconName: 'Coffee', categoryType: 'routine' };
  } else {
    completeDayCells[hiitId] = { id: hiitId, slotId: 's8', dayId: day.id, subject: 'Morning HIIT', teacher: 'Alan', room: 'Gym', notes: 'Workouts', color: 'orange', iconName: 'Dumbbell', categoryType: 'routine' };
  }

  // Breakfast (08:30 - 09:00)
  const breakfastId = `s9b-${day.id}`;
  completeDayCells[breakfastId] = {
    id: breakfastId,
    slotId: 's9b',
    dayId: day.id,
    subject: 'Breakfast',
    teacher: 'Self',
    room: 'Dining Table',
    notes: 'Healthy meal',
    color: 'teal',
    iconName: 'Coffee',
    categoryType: 'routine',
  };

  // Focus block 1 (09:00 - 12:00) - Replaced with AML and OS Lectures
  if (day.id !== 'sat' && day.id !== 'sun') {
    const s10Id = `s10-${day.id}`;
    const s11Id = `s11-${day.id}`;
    const s12Id = `s12-${day.id}`;
    const sub = (day.id === 'tue' || day.id === 'thu') ? 'OS Lec' : 'AML Lec';
    const color = (day.id === 'tue' || day.id === 'thu') ? 'purple' : 'blue';
    const icon = (day.id === 'tue' || day.id === 'thu') ? 'Laptop' : 'BookOpen';

    completeDayCells[s10Id] = { id: s10Id, slotId: 's10', dayId: day.id, subject: sub, teacher: 'Prof. Katherine', room: 'Auditorium Max', notes: 'Main lecture', color, iconName: icon, categoryType: 'academic' };
    completeDayCells[s11Id] = { id: s11Id, slotId: 's11', dayId: day.id, subject: sub, teacher: 'Prof. Katherine', room: 'Auditorium Max', notes: 'Concept practice', color, iconName: icon, categoryType: 'academic' };
    completeDayCells[s12Id] = { id: s12Id, slotId: 's12', dayId: day.id, subject: sub, teacher: 'Prof. Katherine', room: 'Auditorium Max', notes: 'Discussion session', color, iconName: icon, categoryType: 'academic' };
  } else if (day.id === 'sat') {
    const s10Id = `s10-sat`;
    completeDayCells[s10Id] = { id: s10Id, slotId: 's10', dayId: 'sat', subject: 'Personal Reading', teacher: 'Self', room: 'Study Desk', notes: 'Read tech blogs', color: 'green', iconName: 'BookOpen', categoryType: 'study' };
  }

  // Lunch Break (12:00 - 13:00)
  if (day.id !== 'sun') {
    const s13Id = `s13-${day.id}`;
    completeDayCells[s13Id] = { id: s13Id, slotId: 's13', dayId: day.id, subject: 'Lunch Break', teacher: '', room: 'Cafeteria', notes: 'Relax', color: 'gray', iconName: 'Coffee', categoryType: 'routine' };
  }

  // Focus block 2 (13:00 - 16:00) - Replaced with AML and OS Labs
  if (day.id !== 'sat' && day.id !== 'sun') {
    const s14Id = `s14-${day.id}`;
    const s15Id = `s15-${day.id}`;
    const s16Id = `s16-${day.id}`;
    const sub = (day.id === 'tue' || day.id === 'thu') ? 'OS Lab' : 'AML Lab';
    const color = (day.id === 'tue' || day.id === 'thu') ? 'orange' : 'teal';
    const icon = (day.id === 'tue' || day.id === 'thu') ? 'Globe' : 'Terminal';

    completeDayCells[s14Id] = { id: s14Id, slotId: 's14', dayId: day.id, subject: sub, teacher: 'Dr. Marcus', room: 'Lab Hall A', notes: 'Lab workspace', color, iconName: icon, categoryType: 'academic' };
    completeDayCells[s15Id] = { id: s15Id, slotId: 's15', dayId: day.id, subject: sub, teacher: 'Dr. Marcus', room: 'Lab Hall A', notes: 'Team projects', color, iconName: icon, categoryType: 'academic' };
    completeDayCells[s16Id] = { id: s16Id, slotId: 's16', dayId: day.id, subject: sub, teacher: 'Dr. Marcus', room: 'Lab Hall A', notes: 'Queries workout', color, iconName: icon, categoryType: 'academic' };
  }

  // Evening block - Normal coding practice / Self study (18:00 - 20:00)
  if (day.id !== 'sat' && day.id !== 'sun') {
    const s19Id = `s19-${day.id}`;
    const s20Id = `s20-${day.id}`;
    completeDayCells[s19Id] = { id: s19Id, slotId: 's19', dayId: day.id, subject: 'Coding Practice', teacher: 'Self', room: 'Home', notes: 'Personal projects', color: 'blue', iconName: 'Laptop', categoryType: 'study' };
    completeDayCells[s20Id] = { id: s20Id, slotId: 's20', dayId: day.id, subject: 'Coding Practice', teacher: 'Self', room: 'Home', notes: 'Code practice', color: 'blue', iconName: 'Laptop', categoryType: 'study' };
  }
});

// Overlay Deep Learning (Lec/Lab) college times into appropriate slots
// Mon: 14:00 - 15:30 Lec (s15, s16)
completeDayCells['s15-mon-dl'] = { id: 's15-mon-dl', slotId: 's15', dayId: 'mon', subject: 'Deep Learning Lec', teacher: 'Prof. Ray', room: 'C201', notes: '', color: 'pink', iconName: 'Laptop', categoryType: 'academic', eventStartTime: '14:00', eventEndTime: '15:30' };
completeDayCells['s16-mon-dl'] = { id: 's16-mon-dl', slotId: 's16', dayId: 'mon', subject: 'Deep Learning Lec', teacher: 'Prof. Ray', room: 'C201', notes: '', color: 'pink', iconName: 'Laptop', categoryType: 'academic', eventStartTime: '14:00', eventEndTime: '15:30' };

// Tue: 14:00 - 15:30 Lab (s15, s16)
completeDayCells['s15-tue-dl'] = { id: 's15-tue-dl', slotId: 's15', dayId: 'tue', subject: 'Deep Learning Lab', teacher: 'Prof. Ray', room: 'A403/A405', notes: '', color: 'pink', iconName: 'Layers', categoryType: 'academic', eventStartTime: '14:00', eventEndTime: '15:30' };
completeDayCells['s16-tue-dl'] = { id: 's16-tue-dl', slotId: 's16', dayId: 'tue', subject: 'Deep Learning Lab', teacher: 'Prof. Ray', room: 'A403/A405', notes: '', color: 'pink', iconName: 'Layers', categoryType: 'academic', eventStartTime: '14:00', eventEndTime: '15:30' };

// Wed: 13:30 - 15:00 Lec (s14, s15)
completeDayCells['s14-wed-dl'] = { id: 's14-wed-dl', slotId: 's14', dayId: 'wed', subject: 'Deep Learning Lec', teacher: 'Prof. Ray', room: 'C201', notes: '', color: 'pink', iconName: 'Laptop', categoryType: 'academic', eventStartTime: '13:30', eventEndTime: '15:00' };
completeDayCells['s15-wed-dl'] = { id: 's15-wed-dl', slotId: 's15', dayId: 'wed', subject: 'Deep Learning Lec', teacher: 'Prof. Ray', room: 'C201', notes: '', color: 'pink', iconName: 'Laptop', categoryType: 'academic', eventStartTime: '13:30', eventEndTime: '15:00' };

// Thu: 12:30 - 14:00 Lab (s13, s14)
completeDayCells['s13-thu-dl'] = { id: 's13-thu-dl', slotId: 's13', dayId: 'thu', subject: 'Deep Learning Lab', teacher: 'Prof. Ray', room: 'C201/C202', notes: '', color: 'pink', iconName: 'Layers', categoryType: 'academic', eventStartTime: '12:30', eventEndTime: '14:00' };
completeDayCells['s14-thu-dl'] = { id: 's14-thu-dl', slotId: 's14', dayId: 'thu', subject: 'Deep Learning Lab', teacher: 'Prof. Ray', room: 'C201/C202', notes: '', color: 'pink', iconName: 'Layers', categoryType: 'academic', eventStartTime: '12:30', eventEndTime: '14:00' };

export const templates: Template[] = [
  {
    id: 'completeday',
    name: 'Complete Day Planner',
    description: 'A comprehensive 7-day routine covering all 24 hours of the day, including sleep, workouts, classes, and study.',
    days: DEFAULT_DAYS,
    slots: DEFAULT_SLOTS,
    cells: completeDayCells,
  },
];

export const loadInitialState = () => ({
  projectName: 'My 24H Planner',
  slots: DEFAULT_SLOTS,
  days: DEFAULT_DAYS,
  cells: {},
});
