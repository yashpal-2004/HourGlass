import React from 'react';
import { Tags } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { PASTEL_COLORS } from '../../constants';
import { resolveCellsForSlot, getCellCategory } from '../../utils/timetableUtils';

export const Sidebar: React.FC = () => {
  const { cells, slots, days, currentDate } = useTimetable();

  type CategoryEntry = { count: number; hours: number; color: string };
  const academicMap: Record<string, CategoryEntry> = {};
  const studyMap: Record<string, CategoryEntry> = {};
  const routineMap: Record<string, CategoryEntry> = {};
  const wasteMap: Record<string, CategoryEntry> = {};

  const parsedCards: Array<{ cell: ReturnType<typeof resolveCellsForSlot>[number]; start: number; end: number; dayId: string }> = [];

  days.forEach(day => {
    slots.forEach(slot => {
      resolveCellsForSlot(slot.id, day.id, cells, currentDate).forEach(cell => {
        if (cell.subject && cell.subject.trim() !== '') {
          const [sh, sm] = (cell.eventStartTime || slot.startTime).split(':').map(Number);
          const [eh, em] = (cell.eventEndTime || slot.endTime).split(':').map(Number);
          parsedCards.push({ cell, start: sh * 60 + sm, end: eh * 60 + em, dayId: day.id });
        }
      });
    });
  });

  const countedEvents = new Set<string>();

  parsedCards.forEach(({ cell, start, end, dayId }) => {
    const isCustomTime = !!(cell.eventStartTime && cell.eventEndTime);
    const eventKey = isCustomTime ? cell.id : `${dayId}-${cell.slotId}-${cell.subject}`;

    if (!countedEvents.has(eventKey)) {
      countedEvents.add(eventKey);

      const sub = cell.subject.trim();
      const groupType = getCellCategory(cell);
      const targetMap =
        groupType === 'routine' ? routineMap :
        groupType === 'study' ? studyMap :
        groupType === 'waste' ? wasteMap :
        academicMap;

      if (!targetMap[sub]) targetMap[sub] = { count: 0, hours: 0, color: cell.color || 'blue' };
      targetMap[sub].count += 1;
      const diff = end - start;
      if (diff > 0) targetMap[sub].hours += diff / 60;
    }
  });

  const hasAnyCategories =
    Object.keys(academicMap).length > 0 ||
    Object.keys(studyMap).length > 0 ||
    Object.keys(routineMap).length > 0 ||
    Object.keys(wasteMap).length > 0;

  const renderColumn = (title: string, map: Record<string, CategoryEntry>, emptyMsg: string) => (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
        {title}
      </h4>
      {Object.keys(map).length === 0 ? (
        <p className="text-[10px] text-slate-400 italic">{emptyMsg}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {Object.entries(map).map(([name, info]) => {
            const colorConfig =
              (PASTEL_COLORS as Record<string, typeof PASTEL_COLORS.blue>)[info.color] || PASTEL_COLORS.blue;
            return (
              <div
                key={name}
                className={`px-3 py-2 border flex items-center gap-2.5 transition-colors ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{name}</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 shadow-sm border border-slate-100 text-slate-700">
                  {info.count} {info.count === 1 ? 'block' : 'blocks'} ({info.hours.toFixed(1)}h)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-none p-5 shadow-soft w-full flex flex-col gap-5 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Tags className="w-4 h-4 text-slate-800" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Schedules & Categories Overview
          </span>
        </div>
      </div>

      <div className="w-full">
        {!hasAnyCategories ? (
          <div className="py-6 bg-slate-50 border border-slate-200/60 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              No categories allocated yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {renderColumn('College & Work', academicMap, 'No academic categories yet')}
            {renderColumn('Self Study & Learning', studyMap, 'No self study categories yet')}
            {renderColumn('Daily Routine & Life', routineMap, 'No routine categories yet')}
            {renderColumn('Time Waste', wasteMap, 'No time waste categories yet')}
          </div>
        )}
      </div>
    </div>
  );
};
