import React from 'react';
import { BookOpen, Clock, Coffee, PieChart } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';

export const Stats: React.FC = () => {
  const { slots, days, cells, getDayDateKey } = useTimetable();

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const resolveCell = (slotId: string, dayId: string) => {
    const dateKey = getDayDateKey(dayId);
    const dateKeyedId = `${slotId}-${dayId}-${dateKey}`;
    return cells[dateKeyedId] ?? cells[`${slotId}-${dayId}`];
  };

  // Build span map to avoid double-counting merged blocks
  const getCellSpans = () => {
    const spans: Record<string, number> = {};
    const hidden: Record<string, boolean> = {};

    days.forEach(day => {
      let i = 0;
      while (i < slots.length) {
        const slot = slots[i];
        const cellId = `${slot.id}-${day.id}`;
        const cell = resolveCell(slot.id, day.id);

        if (!cell || !cell.subject || cell.subject.trim() === '') {
          i++;
          continue;
        }

        let span = 1;
        let j = i + 1;
        while (j < slots.length) {
          const nextCell = resolveCell(slots[j].id, day.id);
          if (
            nextCell &&
            nextCell.subject === cell.subject &&
            nextCell.teacher === cell.teacher &&
            nextCell.room === cell.room &&
            nextCell.notes === cell.notes &&
            nextCell.color === cell.color &&
            nextCell.iconName === cell.iconName &&
            nextCell.categoryType === cell.categoryType
          ) {
            span++;
            hidden[`${slots[j].id}-${day.id}`] = true;
            j++;
          } else {
            break;
          }
        }

        spans[cellId] = span;
        i = j;
      }
    });

    return { spans, hidden };
  };

  const { spans, hidden } = getCellSpans();

  const getBlockEndTime = (slotId: string, span: number): string => {
    const slotIndex = slots.findIndex(s => s.id === slotId);
    const lastSlotInBlock = slots[slotIndex + span - 1] || slots[slotIndex];
    return lastSlotInBlock.endTime;
  };

  // Totals
  let totalSlotMinutes = 0;
  slots.forEach(slot => {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    totalSlotMinutes += end > start ? end - start : 60;
  });

  const totalPossibleHours = (totalSlotMinutes / 60) * days.length;
  let academicHours = 0;
  let studyHours = 0;
  let routineHours = 0;
  let wasteHours = 0;
  const uniqueCategories = new Set<string>();

  days.forEach(day => {
    slots.forEach(slot => {
      const cellId = `${slot.id}-${day.id}`;
      if (hidden[cellId]) return;

      const cell = resolveCell(slot.id, day.id);
      if (cell && cell.subject && cell.subject.trim() !== '') {
        uniqueCategories.add(cell.subject.trim());

        const span = spans[cellId] || 1;
        const startStr = cell.eventStartTime || slot.startTime;
        const endStr = cell.eventEndTime || getBlockEndTime(slot.id, span);
        const diff = parseTimeToMinutes(endStr) - parseTimeToMinutes(startStr);
        const hr = (diff > 0 ? diff : 60) / 60;

        if (cell.categoryType === 'academic') academicHours += hr;
        else if (cell.categoryType === 'study') studyHours += hr;
        else if (cell.categoryType === 'waste') wasteHours += hr;
        else routineHours += hr;
      }
    });
  });

  const busyHours = academicHours + studyHours + routineHours + wasteHours;
  const freeTimeHours = Math.max(0, totalPossibleHours - busyHours);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 no-print">
      {/* Total Schedule */}
      <div className="bg-white border-t-2 border-t-[#111827] border-x border-b border-slate-200/70 p-5 flex items-center gap-4 transition-all duration-300">
        <div className="w-9 h-9 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Schedule</span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{totalPossibleHours.toFixed(1)}h</span>
        </div>
      </div>

      {/* Active Categories */}
      <div className="bg-white border-t-2 border-t-[#111827] border-x border-b border-slate-200/70 p-5 flex items-center gap-4 transition-all duration-300">
        <div className="w-9 h-9 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Categories</span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{uniqueCategories.size}</span>
        </div>
      </div>

      {/* Busy Hours */}
      <div className="bg-white border-t-2 border-t-[#E11D48] border-x border-b border-slate-200/70 p-5 flex items-center gap-4 transition-all duration-300">
        <div className="w-9 h-9 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800">
          <PieChart className="w-4 h-4" />
        </div>
        <div className="flex-grow">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Busy Hours</span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{busyHours.toFixed(1)}h</span>
          <div className="text-[9px] font-bold text-slate-400/90 mt-1 uppercase tracking-wider space-y-0.5 border-t border-slate-100 pt-1.5">
            <div className="flex items-center justify-between gap-2">
              <span>College:</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>{academicHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Self Study:</span>
              <span style={{ color: '#2563eb', fontWeight: 800 }}>{studyHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Routine & Sleep:</span>
              <span style={{ color: '#9333ea', fontWeight: 800 }}>{routineHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Time Waste:</span>
              <span style={{ color: '#ef4444', fontWeight: 800 }}>{wasteHours.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Free Time */}
      <div className="bg-white border-t-2 border-t-[#111827] border-x border-b border-slate-200/70 p-5 flex items-center gap-4 transition-all duration-300">
        <div className="w-9 h-9 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800">
          <Coffee className="w-4 h-4" />
        </div>
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Free Time</span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{freeTimeHours.toFixed(1)}h</span>
        </div>
      </div>
    </div>
  );
};
