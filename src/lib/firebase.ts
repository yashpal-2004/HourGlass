import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit,
} from 'firebase/firestore';
import type { TimeSlot, Day, TimetableCell, SavedProject } from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyBdppFyjoBLV4V8C23qxnYVS-ByDKOIcgw',
  authDomain: 'nst-tracker.firebaseapp.com',
  projectId: 'nst-tracker',
  storageBucket: 'nst-tracker.firebasestorage.app',
  messagingSenderId: '807619975988',
  appId: '1:807619975988:web:7fff703b8907e1a72b6361',
  measurementId: 'G-BNFXRFRBNT',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedSleepLog {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  dateStr: string;
  timestamp: number;
  napStartTime?: string;
  napEndTime?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_ID_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const standardizeTime = (timeVal: unknown): string => {
  if (!timeVal) return '';
  if (typeof timeVal === 'string') {
    const match = timeVal.match(/^(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
  }
  if (typeof timeVal === 'object' && timeVal !== null && 'seconds' in timeVal) {
    const d = new Date((timeVal as { seconds: number }).seconds * 1000);
    return d.toTimeString().substring(0, 5);
  }
  if (timeVal instanceof Date) {
    return timeVal.toTimeString().substring(0, 5);
  }
  return '';
};

// ---------------------------------------------------------------------------
// Sleep Logs
// ---------------------------------------------------------------------------

export const fetchSleepLogs = async (): Promise<ParsedSleepLog[]> => {
  const collectionsToTry = ['sleep', 'sleepLogs', 'sleep_logs', 'logs'];
  let rawDocs: Record<string, unknown>[] = [];

  for (const colName of collectionsToTry) {
    try {
      const q = query(collection(db, colName), orderBy('date', 'desc'), limit(150));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.forEach(d => rawDocs.push(d.data() as Record<string, unknown>));
        console.log(`Loaded sleep data from Firestore collection: ${colName}`);
        break;
      }
    } catch {
      // try next
    }
  }

  if (rawDocs.length === 0) {
    for (const colName of collectionsToTry) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          snap.forEach(d => rawDocs.push(d.data() as Record<string, unknown>));
          break;
        }
      } catch {
        // silent
      }
    }
  }

  const parsedLogs: ParsedSleepLog[] = [];

  rawDocs.forEach(docData => {
    try {
      let logDate: Date | null = null;
      let dateStr = '';

      if (docData.date) {
        if (typeof docData.date === 'string' && (docData.date as string).includes('-')) {
          const [year, month, day] = (docData.date as string).split('-').map(Number);
          logDate = new Date(year, month - 1, day);
          dateStr = docData.date as string;
        } else if (typeof docData.date === 'object' && docData.date !== null && 'seconds' in docData.date) {
          logDate = new Date((docData.date as { seconds: number }).seconds * 1000);
          dateStr = logDate.toISOString().substring(0, 10);
        } else {
          logDate = new Date(docData.date as string);
          dateStr = logDate.toISOString().substring(0, 10);
        }
      }

      if (!logDate || isNaN(logDate.getTime())) return;

      const start = standardizeTime(docData.sleepTime ?? docData.start ?? docData.startTime ?? docData.sleepStart);
      const end = standardizeTime(docData.wakeTime ?? docData.end ?? docData.endTime ?? docData.sleepEnd);
      const napStart = standardizeTime(docData.napSleepTime ?? docData.napStart ?? docData.napStartTime);
      const napEnd = standardizeTime(docData.napWakeTime ?? docData.napEnd ?? docData.napEndTime);

      if (!start || !end) return;

      parsedLogs.push({
        dayOfWeek: DAY_ID_MAP[logDate.getDay()],
        startTime: start,
        endTime: end,
        dateStr,
        timestamp: logDate.getTime(),
        napStartTime: napStart || undefined,
        napEndTime: napEnd || undefined,
      });
    } catch (err) {
      console.error('Error parsing sleep log doc', err);
    }
  });

  return parsedLogs;
};

// ---------------------------------------------------------------------------
// Global Timetable Persistence
// ---------------------------------------------------------------------------

export const saveTimetableToFirebase = async (
  data: {
    projectName: string;
    slots: TimeSlot[];
    days: Day[];
    cells: Record<string, TimetableCell>;
    is12HourFormat?: boolean;
  },
  docName = 'global',
) => {
  try {
    const docRef = doc(db, 'projects', docName);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    console.log(`Timetable saved to Firebase: ${docName}`);
  } catch (error) {
    console.error(`Error saving timetable (${docName}):`, error);
    throw error;
  }
};

export const loadTimetableFromFirebase = async (
  docName = 'global',
): Promise<{
  projectName: string;
  slots: TimeSlot[];
  days: Day[];
  cells: Record<string, TimetableCell>;
  is12HourFormat?: boolean;
} | null> => {
  try {
    const docRef = doc(db, 'projects', docName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        projectName: data.projectName,
        slots: data.slots,
        days: data.days,
        cells: data.cells,
        is12HourFormat: data.is12HourFormat,
      };
    }
  } catch (error) {
    console.error(`Error loading timetable (${docName}):`, error);
  }
  return null;
};

// ---------------------------------------------------------------------------
// Saved Projects
// ---------------------------------------------------------------------------

export const fetchSavedProjectsFromFirebase = async (): Promise<SavedProject[]> => {
  try {
    const snap = await getDocs(collection(db, 'saved_projects'));
    const projects: SavedProject[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      projects.push({
        id: docSnap.id,
        name: data.name,
        slots: data.slots,
        days: data.days,
        cells: data.cells,
        updatedAt: data.updatedAt,
      });
    });
    return projects;
  } catch (error) {
    console.error('Error loading saved projects:', error);
    return [];
  }
};

export const saveProjectToFirebase = async (project: SavedProject) => {
  try {
    const docRef = doc(db, 'saved_projects', project.id);
    await setDoc(docRef, {
      name: project.name,
      slots: project.slots,
      days: project.days,
      cells: project.cells,
      updatedAt: project.updatedAt,
    });
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const deleteProjectFromFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'saved_projects', id));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};
