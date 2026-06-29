import type { TimetableCell, TimeSlot } from '../types';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Returns the Date object for a given day ID within the current week. */
export const getDayDateObjInUtil = (dayId: string, currentDate: Date): Date => {
  const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(dayId);
  const dateCopy = new Date(currentDate);
  const currentDay = dateCopy.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  dateCopy.setDate(dateCopy.getDate() + diffToMonday + dayIndex);
  return dateCopy;
};

/** Returns ISO date string YYYY-MM-DD for the given dayId in the active week. */
export const getDayDateKeyInUtil = (dayId: string, currentDate: Date): string => {
  const d = getDayDateObjInUtil(dayId, currentDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ---------------------------------------------------------------------------
// Cell resolution
// ---------------------------------------------------------------------------

/**
 * Resolves all active cells for a slot+day combo.
 * Date-keyed override cells take priority over recurring template cells.
 */
export const resolveCellsForSlot = (
  slotId: string,
  dayId: string,
  cells: Record<string, TimetableCell>,
  currentDate: Date,
): TimetableCell[] => {
  const dateKey = getDayDateKeyInUtil(dayId, currentDate);
  const dateKeyedPrefix = `${slotId}-${dayId}-${dateKey}`;
  const dateKeyed = Object.values(cells).filter(
    c =>
      c.dayId === dayId &&
      (c.id === dateKeyedPrefix || c.id.startsWith(dateKeyedPrefix + '-')),
  );
  if (dateKeyed.length > 0) return dateKeyed;

  const templatePrefix = `${slotId}-${dayId}`;
  return Object.values(cells).filter(
    c =>
      c.dayId === dayId &&
      !c.dateKey &&
      (c.id === templatePrefix || c.id.startsWith(templatePrefix + '-')),
  );
};

/** Resolves the first cell for backward compatibility. */
export const resolveCell = (
  slotId: string,
  dayId: string,
  cells: Record<string, TimetableCell>,
  currentDate: Date,
): TimetableCell | null => {
  const list = resolveCellsForSlot(slotId, dayId, cells, currentDate);
  return list[0] ?? null;
};

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

/** Resolves the category group for a cell, falling back to keyword detection. */
export const getCellCategory = (cell: TimetableCell): 'academic' | 'study' | 'routine' | 'waste' => {
  let groupType = cell.categoryType;

  if (!groupType) {
    const lower = (cell.subject || '').toLowerCase();
    const isRoutine =
      lower.includes('hiit') || lower.includes('yoga') || lower.includes('recovery') ||
      lower.includes('rest') || lower.includes('lunch') || lower.includes('coffee') ||
      lower.includes('sleep') || lower.includes('food');
    const isStudy =
      lower.includes('reading') || lower.includes('writing') || lower.includes('curation') ||
      lower.includes('practice') || lower.includes('coding') || lower.includes('study') ||
      lower.includes('learning');
    const isWaste =
      lower.includes('waste') || lower.includes('tv') || lower.includes('game') ||
      lower.includes('netflix') || lower.includes('youtube') || lower.includes('social') ||
      lower.includes('scroll');

    if (isRoutine) groupType = 'routine';
    else if (isStudy) groupType = 'study';
    else if (isWaste) groupType = 'waste';
    else groupType = 'academic';
  }

  return groupType as 'academic' | 'study' | 'routine' | 'waste';
};

// ---------------------------------------------------------------------------
// Day statistics
// ---------------------------------------------------------------------------

/** Calculates time breakdown stats for a specific day in the active week. */
export const getDayStats = (
  dayId: string,
  cells: Record<string, TimetableCell>,
  slots: TimeSlot[],
  currentDate: Date,
) => {
  let totalMinutes = 0;
  let academicMins = 0;
  let studyMins = 0;
  let routineMins = 0;
  let wasteMins = 0;

  const activeCells: TimetableCell[] = [];
  slots.forEach(slot => {
    resolveCellsForSlot(slot.id, dayId, cells, currentDate).forEach(cell => {
      activeCells.push(cell);
    });
  });

  const countedEvents = new Set<string>();

  activeCells.forEach(cell => {
    const slot = slots.find(s => s.id === cell.slotId);
    // Use a dedup key based on subject and custom times when custom times are present.
    // This correctly counts spanned events (like Sleep) once, while keeping separate custom events distinct.
    const hasAnyCustomTime = !!(cell.eventStartTime || cell.eventEndTime);
    const eventKey = hasAnyCustomTime 
      ? `${cell.subject}-${cell.eventStartTime || ''}-${cell.eventEndTime || ''}` 
      : `${cell.slotId}-${cell.subject}`;

    if (!countedEvents.has(eventKey)) {
      countedEvents.add(eventKey);

      const startStr = cell.eventStartTime || slot?.startTime;
      const endStr = cell.eventEndTime || slot?.endTime;
      if (startStr && endStr) {
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        if (diff > 0) {
          totalMinutes += diff;
          const category = getCellCategory(cell);
          if (category === 'academic') academicMins += diff;
          else if (category === 'study') studyMins += diff;
          else if (category === 'routine') routineMins += diff;
          else if (category === 'waste') wasteMins += diff;
        }
      }
    }
  });

  const freeMins = Math.max(0, 1440 - totalMinutes);
  return { totalMinutes, academicMins, studyMins, routineMins, wasteMins, freeMins };
};
