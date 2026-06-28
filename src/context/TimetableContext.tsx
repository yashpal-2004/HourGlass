import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { TimeSlot, Day, TimetableCell, SavedProject } from '../types';
import { templates, loadInitialState as getFallbackState } from '../utils/templates';
import {
  saveTimetableToFirebase,
  loadTimetableFromFirebase,
  fetchSleepLogs,
  fetchSavedProjectsFromFirebase,
  saveProjectToFirebase,
  deleteProjectFromFirebase,
} from '../lib/firebase';
import type { ParsedSleepLog } from '../lib/firebase';

interface HistoryState {
  projectName: string;
  slots: TimeSlot[];
  days: Day[];
  cells: Record<string, TimetableCell>;
}

interface TimetableContextType {
  projectName: string;
  slots: TimeSlot[];
  days: Day[];
  cells: Record<string, TimetableCell>;
  savedProjects: SavedProject[];
  selectedCellIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  setProjectName: (name: string) => void;
  addTimeSlot: (startTime?: string, endTime?: string) => void;
  removeTimeSlot: (id: string) => void;
  updateTimeSlot: (id: string, startTime: string, endTime: string) => void;
  addDay: (name?: string) => void;
  removeDay: (id: string) => void;
  updateDay: (id: string, name: string) => void;
  setCell: (slotId: string, dayId: string, cellData: Partial<Omit<TimetableCell, 'id' | 'slotId' | 'dayId'>>, customCellId?: string, dateKey?: string) => void;
  setCellEveryDay: (slotId: string, cellData: Partial<Omit<TimetableCell, 'id' | 'slotId' | 'dayId'>>) => void;
  getDayDateKey: (dayId: string) => string;
  copyDataToYearEnd: () => Promise<void>;
  clearCell: (slotId: string, dayId: string, dateKey?: string, customCellId?: string) => void;
  clearAllCells: () => void;
  clearThisEvent: (slotId: string, dayId: string) => void;
  clearAllMatchingEvents: (subject: string, dayId?: string) => void;
  loadTemplate: (templateId: string) => void;
  loadSample: () => void;
  saveProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;
  toggleCellSelection: (cellId: string, multi?: boolean) => void;
  clearSelection: () => void;
  duplicateRow: (slotId: string) => void;
  deleteRow: (slotId: string) => void;
  undo: () => void;
  redo: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  is12HourFormat: boolean;
  setIs12HourFormat: (val: boolean) => void;
  formatTime: (timeStr: string) => string;
  isLoading: boolean;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  getDayDate: (dayId: string) => string;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  /** Signals Grid to open the Add-Event modal pre-filled with today's date. */
  triggerAddEvent: () => void;
  /** True while the signal is pending; Grid sets it back to false after consuming. */
  pendingAddEvent: boolean;
  consumeAddEvent: () => void;
}

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

const dayIdMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const TimetableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fallback = getFallbackState();
  const [currentDate, _setCurrentDate] = useState<Date>(() => new Date());
  const [projectName, _setProjectName] = useState<string>(fallback.projectName);
  const [slots, _setSlots] = useState<TimeSlot[]>(fallback.slots);
  const [days, _setDays] = useState<Day[]>(fallback.days);
  const [cells, _setCells] = useState<Record<string, TimetableCell>>(fallback.cells);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('subjects');
  const [is12HourFormat, setIs12HourFormat] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cache sleep logs locally to speed up filtering on date changes
  const [allSleepLogs, setAllSleepLogs] = useState<ParsedSleepLog[]>([]);

  // Add-Event signal: Toolbar sets this to true, Grid consumes it
  const [pendingAddEvent, setPendingAddEvent] = useState(false);
  const triggerAddEvent = () => setPendingAddEvent(true);
  const consumeAddEvent = () => setPendingAddEvent(false);

  // History Undo/Redo Stacks
  const [historyPast, setHistoryPast] = useState<HistoryState[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistoryState[]>([]);

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the initial load from Firebase is complete — prevents saving stale fallback state
  const hasLoadedRef = useRef<boolean>(false);
  // FIX Bug 8: Hold a ref to the pending debounce save so navigation can flush it first.
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of the state to save (kept in sync by the debounce effect).
  const pendingSaveDataRef = useRef<{
    projectName: string;
    slots: TimeSlot[];
    days: Day[];
    cells: Record<string, TimetableCell>;
    is12HourFormat: boolean;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };



  const getDayDateObj = (dayId: string): Date => {
    const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(dayId);
    const dateCopy = new Date(currentDate);
    const currentDay = dateCopy.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    dateCopy.setDate(dateCopy.getDate() + diffToMonday + dayIndex);
    return dateCopy;
  };

  const getDayDate = (dayId: string): string => {
    const targetDate = getDayDateObj(dayId);
    return targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  // Returns ISO date string YYYY-MM-DD for the given dayId in the active week
  const getDayDateKey = (dayId: string): string => {
    const d = getDayDateObj(dayId);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const setCurrentDate = (date: Date) => {
    _setCurrentDate(date);
  };

  // FIX Bug 8: Flush pending save before changing the active week.
  const goToPreviousWeek = () => {
    flushAndNavigate(() => {
      _setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() - 7);
        return next;
      });
    });
  };

  const goToNextWeek = () => {
    flushAndNavigate(() => {
      _setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 7);
        return next;
      });
    });
  };

  const goToCurrentWeek = () => {
    flushAndNavigate(() => {
      _setCurrentDate(new Date());
    });
  };

  // Helper to record history before an operation
  const recordHistory = (
    currentProjectName = projectName,
    currentSlots = slots,
    currentDays = days,
    currentCells = cells
  ) => {
    setHistoryPast((prev) => [
      ...prev,
      {
        projectName: currentProjectName,
        slots: JSON.parse(JSON.stringify(currentSlots)),
        days: JSON.parse(JSON.stringify(currentDays)),
        cells: JSON.parse(JSON.stringify(currentCells)),
      },
    ]);
    setHistoryFuture([]);
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [
      ...prev,
      {
        projectName,
        slots: JSON.parse(JSON.stringify(slots)),
        days: JSON.parse(JSON.stringify(days)),
        cells: JSON.parse(JSON.stringify(cells)),
      },
    ]);

    _setProjectName(previous.projectName);
    _setSlots(previous.slots);
    _setDays(previous.days);
    _setCells(previous.cells);
    showToast('Action undone', 'info');
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [
      ...prev,
      {
        projectName,
        slots: JSON.parse(JSON.stringify(slots)),
        days: JSON.parse(JSON.stringify(days)),
        cells: JSON.parse(JSON.stringify(cells)),
      },
    ]);

    _setProjectName(next.projectName);
    _setSlots(next.slots);
    _setDays(next.days);
    _setCells(next.cells);
    showToast('Action redone', 'info');
  };

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  // Process sleep logs and map to the active cells state for the SPECIFIC active week dates
  const mergeSleepLogsIntoCells = (
    currentCells: Record<string, TimetableCell>,
    sleepLogs: ParsedSleepLog[],
    currentSlots: TimeSlot[]
  ): Record<string, TimetableCell> => {
    const updatedCells = { ...currentCells };

    // Remove existing Sleep and Nap blocks to prevent duplicate or stale entries
    Object.keys(updatedCells).forEach(key => {
      if (updatedCells[key].subject === 'Sleep' || key.endsWith('-nap')) {
        delete updatedCells[key];
      }
    });

    if (sleepLogs.length === 0) return updatedCells;

    // Filter sleep logs that match the dates of our active week exactly
    // E.g. we resolve the exact Date strings (YYYY-MM-DD) for our active week's days
    const activeWeekDates: Record<string, string> = {};
    days.forEach(day => {
      const dObj = getDayDateObj(day.id);
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getDate()).padStart(2, '0');
      activeWeekDates[day.id] = `${yyyy}-${mm}-${dd}`;
    });

    // Populate sleep logs matching those dates
    days.forEach(day => {
      const dateStr = activeWeekDates[day.id];
      const log = sleepLogs.find(l => l.dateStr === dateStr);
      if (!log) return;

      const startHour = parseInt(log.startTime.split(':')[0], 10);
      const endHour = parseInt(log.endTime.split(':')[0], 10);

      currentSlots.forEach(slot => {
        const slotHour = parseInt(slot.startTime.split(':')[0], 10);
        let isSleeping = false;

        if (startHour < endHour) {
          isSleeping = slotHour >= startHour && slotHour < endHour;
        } else {
          // Night sleep portion on this day (after bed-time)
          isSleeping = slotHour >= startHour;
        }

        if (isSleeping) {
          const cellId = `${slot.id}-${day.id}`;
          updatedCells[cellId] = {
            id: cellId,
            slotId: slot.id,
            dayId: day.id,
            subject: 'Sleep',
            teacher: '',
            room: 'Bedroom',
            notes: `Logged Sleep (${log.startTime} - ${log.endTime})`,
            color: 'gray',
            iconName: 'Coffee',
            categoryType: 'routine',
            eventStartTime: log.startTime,
            eventEndTime: log.endTime
          };
        }
      });

      // Night sleep portion extending into the next morning
      if (startHour > endHour) {
        const nextDayIndex = (dayIdMap.indexOf(day.id) + 1) % 7;
        const nextDayId = dayIdMap[nextDayIndex];

        currentSlots.forEach(slot => {
          const slotHour = parseInt(slot.startTime.split(':')[0], 10);
          if (slotHour < endHour) {
            const cellId = `${slot.id}-${nextDayId}`;
            updatedCells[cellId] = {
              id: cellId,
              slotId: slot.id,
              dayId: nextDayId,
              subject: 'Sleep',
              teacher: '',
              room: 'Bedroom',
              notes: `Logged Sleep (Woke at ${log.endTime})`,
              color: 'gray',
              iconName: 'Coffee',
              categoryType: 'routine',
              eventStartTime: log.startTime,
              eventEndTime: log.endTime
            };
          }
        });
      }

      // Map Naps if present in the Firebase log data
      if (log.napStartTime && log.napEndTime) {
        const napStartHour = parseInt(log.napStartTime.split(':')[0], 10);
        const napEndHour = parseInt(log.napEndTime.split(':')[0], 10);

        currentSlots.forEach(slot => {
          const slotHour = parseInt(slot.startTime.split(':')[0], 10);
          const isNapping = slotHour >= napStartHour && slotHour < napEndHour;

          if (isNapping) {
            const mainCellId = `${slot.id}-${day.id}`;
            const hasExistingEvent = updatedCells[mainCellId] && updatedCells[mainCellId].subject && updatedCells[mainCellId].subject !== 'Sleep';
            
            const cellId = hasExistingEvent ? `${mainCellId}-nap` : mainCellId;

            updatedCells[cellId] = {
              id: cellId,
              slotId: slot.id,
              dayId: day.id,
              subject: 'Sleep',
              teacher: '',
              room: 'Home / Rest',
              notes: `Logged Nap (${log.napStartTime} - ${log.napEndTime})`,
              color: 'gray',
              iconName: 'Coffee',
              categoryType: 'routine',
              eventStartTime: log.napStartTime,
              eventEndTime: log.napEndTime
            };
          }
        });
      }
    });

    return updatedCells;
  };

  // Async Load State on Mount & Date/Week Change
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        setIsLoading(true);

        // Fetch saved projects & sleep logs on initial mount
        let fetchedSleepLogs = allSleepLogs;
        if (allSleepLogs.length === 0) {
          fetchedSleepLogs = await fetchSleepLogs();
          setAllSleepLogs(fetchedSleepLogs);
          const savedList = await fetchSavedProjectsFromFirebase();
          setSavedProjects(savedList);
        }

        // Fetch global master timetable
        const weekProject = await loadTimetableFromFirebase('global');

        let activeProjName = `Week ${getDayDate('mon')} - ${getDayDate('sun')}`;
        let activeSlots = fallback.slots;
        let activeDays = fallback.days;
        let activeCells: Record<string, TimetableCell> = {}; // Start fresh if no week layout is stored yet

        if (weekProject) {
          activeProjName = weekProject.projectName;
          activeSlots = weekProject.slots;
          activeDays = weekProject.days;
          activeCells = weekProject.cells;
          if (weekProject.is12HourFormat !== undefined) {
            setIs12HourFormat(weekProject.is12HourFormat);
          }
        } else {
          // If no custom timetable exists for this week yet, copy default template slots/days but keep cells empty for sleep
          activeSlots = fallback.slots;
          activeDays = fallback.days;
        }

        // Migration: if old unsplit s9 (1 hour) exists, it was already removed in a past deploy.
        // Now reverse the s9a+s9b split — merge them back into one 1-hour slot (s9a, 08:00-09:00)
        const hasS9a = activeSlots.some(s => s.id === 's9a');
        const hasS9b = activeSlots.some(s => s.id === 's9b');
        if (hasS9a && hasS9b) {
          // Extend s9a to cover the full hour and drop s9b
          activeSlots = activeSlots
            .map(s => s.id === 's9a' ? { ...s, startTime: '08:00', endTime: '09:00' } : s)
            .filter(s => s.id !== 's9b');

          // Move any cells from s9b into s9a, skipping if s9a already has a non-empty event
          const newCells = { ...activeCells };
          activeDays.forEach(day => {
            const s9aCellId = `s9a-${day.id}`;
            const s9bCellId = `s9b-${day.id}`;
            const s9aCell = newCells[s9aCellId];
            const s9bCell = newCells[s9bCellId];
            // If s9a is empty but s9b has content, promote s9b content to s9a
            const s9aEmpty = !s9aCell || !s9aCell.subject || s9aCell.subject.trim() === '';
            if (s9aEmpty && s9bCell && s9bCell.subject && s9bCell.subject.trim() !== '') {
              newCells[s9aCellId] = { ...s9bCell, id: s9aCellId, slotId: 's9a' };
            }
            delete newCells[s9bCellId];
          });
          activeCells = newCells;
        }

        // Legacy: migrate old unsplit s9 if it somehow still exists
        const hasOldS9 = activeSlots.some(s => s.id === 's9');
        if (hasOldS9) {
          activeSlots = activeSlots.map(s =>
            s.id === 's9' ? { ...s, id: 's9a', startTime: '08:00', endTime: '09:00' } : s
          );
          const newCells = { ...activeCells };
          activeDays.forEach(day => {
            const oldId = `s9-${day.id}`;
            if (newCells[oldId]) {
              newCells[`s9a-${day.id}`] = { ...newCells[oldId], id: `s9a-${day.id}`, slotId: 's9a' };
              delete newCells[oldId];
            }
          });
          activeCells = newCells;
        }

        // Filter out college classes if the week starts before college starts (August 10, 2026)
        // We identify a college class as an academic cell where a teacher is specified and the teacher is not 'Self'.
        // This preserves personal goals/study like LEETCODE (which are academic/self) but hides lecture/lab slots.
        const monDate = getDayDateObj('mon');
        const startCollegeDate = new Date(2026, 7, 10); // August 10, 2026 (Month is 0-indexed)
        if (monDate < startCollegeDate) {
          const filtered: Record<string, TimetableCell> = {};
          Object.keys(activeCells).forEach(key => {
            const cell = activeCells[key];
            const isCollege = cell.categoryType === 'academic' && cell.teacher && cell.teacher.toLowerCase() !== 'self';
            if (!isCollege) {
              filtered[key] = cell;
            }
          });
          activeCells = filtered;
        }

        // Merge daily sleep data specifically matching the active week's calendar dates
        activeCells = mergeSleepLogsIntoCells(activeCells, fetchedSleepLogs, activeSlots);

        _setProjectName(activeProjName);
        _setSlots(activeSlots);
        _setDays(activeDays);
        _setCells(activeCells);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load week data from Firebase", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWeekData();
  }, [currentDate]);

  // Debounced Firebase State Save (Saves active master timetable to global doc)
  useEffect(() => {
    // Only save after the initial Firebase load has completed
    if (!hasLoadedRef.current) return;

    // Keep pending data snapshot up-to-date so flushPendingSave can use it.
    pendingSaveDataRef.current = { projectName, slots, days, cells, is12HourFormat };

    const doSave = async () => {
      const data = pendingSaveDataRef.current;
      if (!data) return;
      // Filter out Sleep/Nap cells before saving to master global timetable
      const currentFilteredCells: Record<string, TimetableCell> = {};
      Object.keys(data.cells).forEach(key => {
        const cell = data.cells[key];
        if (cell.subject !== 'Sleep' && !key.endsWith('-nap')) {
          currentFilteredCells[key] = cell;
        }
      });

      const monDate = getDayDateObj('mon');
      const startCollegeDate = new Date(2026, 7, 10);
      let finalCells = currentFilteredCells;

      if (monDate < startCollegeDate) {
        try {
          const existingGlobal = await loadTimetableFromFirebase('global');
          if (existingGlobal && existingGlobal.cells) {
            const preservedCollege: Record<string, TimetableCell> = {};
            Object.keys(existingGlobal.cells).forEach(key => {
              const cell = existingGlobal.cells[key];
              const isCollege = cell.categoryType === 'academic' && cell.teacher && cell.teacher.toLowerCase() !== 'self';
              if (isCollege) {
                preservedCollege[key] = cell;
              }
            });
            finalCells = { ...currentFilteredCells, ...preservedCollege };
          }
        } catch (e) {
          console.error("Error preserving college classes on save:", e);
        }
      }

      await saveTimetableToFirebase({
        projectName: data.projectName,
        slots: data.slots,
        days: data.days,
        cells: finalCells,
        is12HourFormat: data.is12HourFormat,
      }, 'global');
    };

    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      doSave();
    }, 2500);

    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    };
  }, [projectName, slots, days, cells, is12HourFormat]);

  // FIX Bug 8: Flush any pending debounced save immediately, then execute navigation.
  const flushAndNavigate = async (navigate: () => void) => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
      pendingSaveRef.current = null;
      showToast('Saving changes before navigating…', 'info');
      try {
        const data = pendingSaveDataRef.current;
        if (data) {
          const currentFilteredCells: Record<string, TimetableCell> = {};
          Object.keys(data.cells).forEach(key => {
            const cell = data.cells[key];
            if (cell.subject !== 'Sleep' && !key.endsWith('-nap')) {
              currentFilteredCells[key] = cell;
            }
          });

          const monDate = getDayDateObj('mon');
          const startCollegeDate = new Date(2026, 7, 10);
          let finalCells = currentFilteredCells;
          if (monDate < startCollegeDate) {
            try {
              const existingGlobal = await loadTimetableFromFirebase('global');
              if (existingGlobal && existingGlobal.cells) {
                const preservedCollege: Record<string, TimetableCell> = {};
                Object.keys(existingGlobal.cells).forEach(key => {
                  const cell = existingGlobal.cells[key];
                  const isCollege = cell.categoryType === 'academic' && cell.teacher && cell.teacher.toLowerCase() !== 'self';
                  if (isCollege) preservedCollege[key] = cell;
                });
                finalCells = { ...currentFilteredCells, ...preservedCollege };
              }
            } catch { /* proceed anyway */ }
          }

          // Race against a 5-second timeout — navigate regardless of outcome.
          await Promise.race([
            saveTimetableToFirebase({
              projectName: data.projectName,
              slots: data.slots,
              days: data.days,
              cells: finalCells,
              is12HourFormat: data.is12HourFormat,
            }, 'global'),
            new Promise<void>(resolve => setTimeout(resolve, 5000)),
          ]);
        }
      } catch (e) {
        console.error('Error flushing save before navigation:', e);
      }
    }
    navigate();
  };

  const setProjectName = (name: string) => {
    recordHistory();
    _setProjectName(name);
  };

  const addTimeSlot = (startTime?: string, endTime?: string) => {
    recordHistory();
    const newId = `s-${Date.now()}`;
    let start = '16:00';
    let end = '17:00';

    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      start = lastSlot.endTime;
      const [h, m] = start.split(':').map(Number);
      const endHour = (h + 1) % 24;
      const endHourStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
      const minStr = m < 10 ? `0${m}` : `${m}`;
      end = `${endHourStr}:${minStr}`;
    }

    const newSlot: TimeSlot = { id: newId, startTime: startTime || start, endTime: endTime || end };
    _setSlots((prev) => [...prev, newSlot]);
    showToast('Time slot added');
  };

  const removeTimeSlot = (id: string) => {
    recordHistory();
    _setSlots((prev) => prev.filter((s) => s.id !== id));
    _setCells((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (copy[key].slotId === id) {
          delete copy[key];
        }
      });
      return copy;
    });
    showToast('Time slot removed', 'info');
  };

  const updateTimeSlot = (id: string, startTime: string, endTime: string) => {
    recordHistory();
    _setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, startTime, endTime } : s))
    );
  };

  const addDay = (name = 'New Day') => {
    recordHistory();
    const newId = `d-${Date.now()}`;
    const newDay: Day = { id: newId, name };
    _setDays((prev) => [...prev, newDay]);
    showToast('Day column added');
  };

  const removeDay = (id: string) => {
    recordHistory();
    _setDays((prev) => prev.filter((d) => d.id !== id));
    _setCells((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((key) => {
        if (copy[key].dayId === id) {
          delete copy[key];
        }
      });
      return copy;
    });
    showToast('Day column removed', 'info');
  };

  const updateDay = (id: string, name: string) => {
    recordHistory();
    _setDays((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  };

  const setCell = (
    slotId: string,
    dayId: string,
    cellData: Partial<Omit<TimetableCell, 'id' | 'slotId' | 'dayId'>>,
    customCellId?: string,
    dateKey?: string
  ) => {
    recordHistory();
    const timeSuffix = cellData.eventStartTime ? `-${cellData.eventStartTime.replace(':', '')}` : '';
    const cellId = customCellId || (dateKey ? `${slotId}-${dayId}-${dateKey}${timeSuffix}` : `${slotId}-${dayId}${timeSuffix}`);
    _setCells((prev) => {
      const existing = prev[cellId] || {
        id: cellId,
        slotId,
        dayId,
        subject: '',
        teacher: '',
        room: '',
        notes: '',
        color: 'blue',
        iconName: 'BookOpen',
      };

      const newCell = {
        ...existing,
        ...cellData,
        ...(dateKey ? { dateKey } : {}),
      };

      const updated = {
        ...prev,
        [cellId]: newCell,
      };

      // If color was changed and subject is valid, apply this color to all matching subjects
      if (cellData.color && newCell.subject) {
        const targetSubject = newCell.subject.trim();
        if (targetSubject !== '') {
          Object.keys(updated).forEach((key) => {
            if (updated[key].subject && updated[key].subject.trim() === targetSubject) {
              updated[key] = {
                ...updated[key],
                color: cellData.color!,
              };
            }
          });
        }
      }

      return updated;
    });
  };

  // Save the same event to every day column in the weekly template
  // FIX Bug 4: Before writing the new template cell, delete all existing date-keyed
  // overrides (slotId-dayId-YYYY-MM-DD*) so the new template is not shadowed.
  const setCellEveryDay = (
    slotId: string,
    cellData: Partial<Omit<TimetableCell, 'id' | 'slotId' | 'dayId'>>
  ) => {
    recordHistory();
    _setCells((prev) => {
      const copy = { ...prev };
      days.forEach((d) => {
        // Remove any date-keyed overrides for this slot+day so the new template wins
        const dateKeyedPrefix = `${slotId}-${d.id}-`;
        Object.keys(copy).forEach(key => {
          if (key.startsWith(dateKeyedPrefix) && copy[key].dateKey) {
            delete copy[key];
          }
        });

        const timeSuffix = cellData.eventStartTime ? `-${cellData.eventStartTime.replace(':', '')}` : '';
        const cellId = `${slotId}-${d.id}${timeSuffix}`;
        copy[cellId] = {
          id: cellId,
          slotId,
          dayId: d.id,
          subject: cellData.subject?.toUpperCase() || '',
          teacher: cellData.teacher?.toUpperCase() || '',
          room: cellData.room?.toUpperCase() || '',
          notes: cellData.notes?.toUpperCase() || '',
          color: cellData.color || 'blue',
          iconName: cellData.iconName || 'BookOpen',
          categoryType: cellData.categoryType || 'academic',
          eventStartTime: cellData.eventStartTime,
          eventEndTime: cellData.eventEndTime,
        };
      });
      return copy;
    });
  };

  const clearCell = (slotId: string, dayId: string, dateKey?: string, customCellId?: string) => {
    recordHistory();
    _setCells((prev) => {
      const copy = { ...prev };
      if (customCellId) {
        delete copy[customCellId];
      } else {
        const prefix = dateKey ? `${slotId}-${dayId}-${dateKey}` : `${slotId}-${dayId}`;
        Object.keys(copy).forEach((key) => {
          if (key.startsWith(prefix)) {
            delete copy[key];
          }
        });
      }
      return copy;
    });
  };

  const resolveCellInProvider = (slotId: string, dayId: string, currentCells: Record<string, TimetableCell>) => {
    const d = getDayDateObj(dayId);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dateKeyedId = `${slotId}-${dayId}-${dateKey}`;
    if (currentCells[dateKeyedId]) {
      return { cell: currentCells[dateKeyedId], id: dateKeyedId };
    }
    const templateId = `${slotId}-${dayId}`;
    return { cell: currentCells[templateId], id: templateId };
  };

  // Clear an entire contiguous span (all consecutive matching cells in the day column)
  // FIX Bug 3: After resolving the topmost cell and deleting it, also delete ALL keys that
  // share the same slotId-dayId prefix (both date-keyed and template layers) so orphaned
  // template cells under a date-keyed override do not re-appear after clear.
  const clearThisEvent = (slotId: string, dayId: string) => {
    recordHistory();
    const resolved = resolveCellInProvider(slotId, dayId, cells);
    const sourceCell = resolved.cell;
    if (!sourceCell) return;
    _setCells((prev) => {
      const copy = { ...prev };
      // Find the start of the span (walk upward)
      const slotIdx = slots.findIndex(s => s.id === slotId);
      let start = slotIdx;
      while (start > 0) {
        const prevRes = resolveCellInProvider(slots[start - 1].id, dayId, copy);
        const prevCell = prevRes.cell;
        if (
          prevCell &&
          prevCell.subject === sourceCell.subject &&
          prevCell.teacher === sourceCell.teacher &&
          prevCell.room === sourceCell.room &&
          prevCell.notes === sourceCell.notes &&
          prevCell.color === sourceCell.color
        ) { start--; } else break;
      }
      // Delete from start downward while cells match
      let i = start;
      while (i < slots.length) {
        const currentRes = resolveCellInProvider(slots[i].id, dayId, copy);
        const c = currentRes.cell;
        if (
          c &&
          c.subject === sourceCell.subject &&
          c.teacher === sourceCell.teacher &&
          c.room === sourceCell.room &&
          c.notes === sourceCell.notes &&
          c.color === sourceCell.color
        ) {
          // Delete the resolved (topmost) cell AND every key with this slotId-dayId prefix
          // so that a shadowed template cell does not re-surface after the override is removed.
          const prefixToWipe = `${slots[i].id}-${dayId}`;
          Object.keys(copy).forEach(key => {
            if (key === prefixToWipe || key.startsWith(prefixToWipe + '-')) {
              delete copy[key];
            }
          });
          i++;
        } else break;
      }
      return copy;
    });
  };

  // Clear ALL cells with the same subject (optionally restrict to a single day)
  // FIX Bug 7: Guard against deleting Sleep cells — they are read-only runtime injections.
  const clearAllMatchingEvents = (subject: string, dayId?: string) => {
    if (subject === 'Sleep') {
      showToast('Sleep logs are read-only and cannot be deleted here.', 'info');
      return;
    }
    recordHistory();
    _setCells((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach(id => {
        const c = copy[id];
        if (c && c.subject === subject && (!dayId || c.dayId === dayId)) {
          delete copy[id];
        }
      });
      return copy;
    });
  };

  const clearAllCells = () => {
    recordHistory();
    _setCells((prev) => {
      const copy: Record<string, TimetableCell> = {};
      Object.keys(prev).forEach(key => {
        const cell = prev[key];
        if (cell && (cell.subject === 'Sleep' || key.endsWith('-nap'))) {
          copy[key] = cell;
        }
      });
      return copy;
    });
    showToast('Cleared all entries except Sleep and Naps', 'info');
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    recordHistory();
    _setProjectName(template.name);
    _setSlots(template.slots);
    _setDays(template.days);
    
    // Merge sleep logs on top of template cells
    const merged = mergeSleepLogsIntoCells(template.cells, allSleepLogs, template.slots);
    _setCells(merged);
    showToast(`Loaded ${template.name}`);
  };

  const loadSample = () => {
    loadTemplate('completeday');
  };

  const saveProject = async () => {
    const newProject: SavedProject = {
      id: `p-${Date.now()}`,
      name: projectName,
      slots: JSON.parse(JSON.stringify(slots)),
      days: JSON.parse(JSON.stringify(days)),
      cells: JSON.parse(JSON.stringify(cells)),
      updatedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      await saveProjectToFirebase(newProject);
      setSavedProjects((prev) => {
        return [newProject, ...prev.filter((p) => p.name !== projectName)];
      });
      showToast('Project saved to Firebase');
    } catch (e) {
      showToast('Failed to save project to Firebase', 'error');
    }
  };

  const loadProject = (id: string) => {
    const project = savedProjects.find((p) => p.id === id);
    if (!project) return;
    recordHistory();
    _setProjectName(project.name);
    _setSlots(project.slots);
    _setDays(project.days);
    _setCells(project.cells);
    showToast(`Loaded project: ${project.name}`);
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteProjectFromFirebase(id);
      setSavedProjects((prev) => prev.filter((p) => p.id !== id));
      showToast('Project deleted from Firebase', 'info');
    } catch (e) {
      showToast('Failed to delete project', 'error');
    }
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify({ projectName, slots, days, cells });
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_timetable.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('JSON Exported successfully');
  };

  const importJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.slots && parsed.days && parsed.cells) {
        recordHistory();
        _setProjectName(parsed.projectName || 'Imported Project');
        _setSlots(parsed.slots);
        _setDays(parsed.days);
        _setCells(parsed.cells);
        showToast('JSON imported successfully');
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    showToast('Invalid JSON file format', 'error');
    return false;
  };

  const toggleCellSelection = (cellId: string, multi = false) => {
    setSelectedCellIds((prev) => {
      if (multi) {
        if (prev.includes(cellId)) {
          return prev.filter((id) => id !== cellId);
        } else {
          return [...prev, cellId];
        }
      } else {
        return prev.includes(cellId) && prev.length === 1 ? [] : [cellId];
      }
    });
  };

  const clearSelection = () => {
    setSelectedCellIds([]);
  };

  const duplicateRow = (slotId: string) => {
    recordHistory();
    const sourceSlot = slots.find((s) => s.id === slotId);
    if (!sourceSlot) return;

    const newId = `s-${Date.now()}`;
    const newSlot: TimeSlot = {
      id: newId,
      startTime: sourceSlot.startTime,
      endTime: sourceSlot.endTime,
    };

    const index = slots.findIndex((s) => s.id === slotId);
    const updatedSlots = [...slots];
    updatedSlots.splice(index + 1, 0, newSlot);
    _setSlots(updatedSlots);

    _setCells((prev) => {
      const nextCells = { ...prev };
      days.forEach((day) => {
        const sourceCellId = `${slotId}-${day.id}`;
        if (prev[sourceCellId]) {
          const targetCellId = `${newId}-${day.id}`;
          nextCells[targetCellId] = {
            ...prev[sourceCellId],
            id: targetCellId,
            slotId: newId,
          };
        }
      });
      return nextCells;
    });

    showToast('Row duplicated');
  };

  const copyDataToYearEnd = async () => {
    try {
      showToast('Applying timetable to all weeks...', 'info');

      // Filter out Sleep cells so we don't write static sleep logs into other weeks
      const filteredCells: Record<string, TimetableCell> = {};
      Object.keys(cells).forEach(key => {
        const cell = cells[key];
        if (cell.subject !== 'Sleep' && !key.endsWith('-nap')) {
          filteredCells[key] = cell;
        }
      });

      const today = new Date(currentDate);
      const currentYear = today.getFullYear();

      // Find the next Monday
      const currentDay = today.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today.setDate(today.getDate() + diffToMonday));

      // Iterate week by week until the end of the year
      const promises = [];
      const tempDate = new Date(monday);

      while (tempDate.getFullYear() === currentYear) {
        const yyyy = tempDate.getFullYear();
        const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
        const dd = String(tempDate.getDate()).padStart(2, '0');
        const targetWeekId = `${yyyy}_${mm}_${dd}`;

        promises.push(
          saveTimetableToFirebase({
            projectName,
            slots,
            days,
            cells: filteredCells,
            is12HourFormat
          }, `global_week_${targetWeekId}`)
        );

        // Advance by 7 days
        tempDate.setDate(tempDate.getDate() + 7);
      }

      await Promise.all(promises);
      showToast('Timetable applied to all weeks till year end!');
    } catch (err) {
      console.error(err);
      showToast('Failed to apply timetable to all weeks', 'error');
    }
  };

  const deleteRow = (slotId: string) => {
    removeTimeSlot(slotId);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (!is12HourFormat) return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const hFormatted = h < 10 ? `0${h}` : h;
    return `${hFormatted}:${m} ${ampm}`;
  };

  return (
    <TimetableContext.Provider
      value={{
        projectName,
        slots,
        days,
        cells,
        savedProjects,
        selectedCellIds,
        canUndo,
        canRedo,
        setProjectName,
        addTimeSlot,
        removeTimeSlot,
        updateTimeSlot,
        addDay,
        removeDay,
        updateDay,
        setCell,
        copyDataToYearEnd,
        clearCell,
        clearAllCells,
        clearThisEvent,
        clearAllMatchingEvents,
        loadTemplate,
        loadSample,
        saveProject,
        loadProject,
        deleteProject,
        exportJSON,
        importJSON,
        toggleCellSelection,
        clearSelection,
        duplicateRow,
        deleteRow,
        undo,
        redo,
        showToast,
        toast,
        activeTab,
        setActiveTab,
        is12HourFormat,
        setIs12HourFormat,
        formatTime,
        isLoading,
        currentDate,
        setCurrentDate,
        getDayDate,
        getDayDateKey,
        goToPreviousWeek,
        goToNextWeek,
        goToCurrentWeek,
        setCellEveryDay,
        triggerAddEvent,
        pendingAddEvent,
        consumeAddEvent,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};
