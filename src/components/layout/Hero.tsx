import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, Calendar } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { PASTEL_COLORS } from '../../constants';
import type { TimetableCell } from '../../types';

export const Hero: React.FC = () => {
  const { slots, days, cells, formatTime } = useTimetable();

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getTodaySchedule = () => {
    const todayIndex = new Date().getDay();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[todayIndex];

    const activeDay = days.find(d => d.name.toLowerCase() === todayName.toLowerCase());
    if (!activeDay) {
      return { dayName: todayName, items: [], isWeekend: todayIndex === 0 || todayIndex === 6 };
    }

    const items = slots
      .map(slot => {
        const cell = cells[`${slot.id}-${activeDay.id}`];
        return { slot, cell };
      })
      .filter(item => item.cell && item.cell.subject && item.cell.subject.trim() !== '')
      .sort((a, b) => parseTimeToMinutes(a.slot.startTime) - parseTimeToMinutes(b.slot.startTime));

    // Merge consecutive identical items
    const merged: Array<{ slot: { startTime: string; endTime: string }; cell: TimetableCell }> = [];

    items.forEach(item => {
      if (merged.length === 0) {
        merged.push({ slot: { ...item.slot }, cell: item.cell });
      } else {
        const last = merged[merged.length - 1];
        const isSleepMerge = item.cell.subject === 'Sleep' && last.cell.subject === 'Sleep';
        const isIdenticalMerge =
          last.cell.subject === item.cell.subject &&
          last.cell.teacher === item.cell.teacher &&
          last.cell.room === item.cell.room &&
          last.cell.notes === item.cell.notes &&
          last.cell.color === item.cell.color;

        if (isSleepMerge || isIdenticalMerge) {
          last.slot.endTime = item.slot.endTime;
        } else {
          merged.push({ slot: { ...item.slot }, cell: item.cell });
        }
      }
    });

    return { dayName: activeDay.name, items: merged, isWeekend: false };
  };

  const { dayName, items, isWeekend } = getTodaySchedule();

  return (
    <div className="relative overflow-hidden bg-white pt-20 pb-28 px-8 no-print border-b border-slate-100">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-[#111827] leading-[1.05] mb-6 uppercase">
            Create Beautiful
            <span className="block text-transparent bg-clip-text [-webkit-text-stroke:1.5px_#111827] font-normal italic lowercase tracking-tight">
              schedules with Hourglass
            </span>
          </h1>

          <p className="text-sm text-slate-500 max-w-lg mb-8 leading-relaxed">
            Organize lectures, school schedules, study plans, workouts, or employee rosters. Fast,
            interactive, and customizable. Export instantly to PDF or image formats.
          </p>
        </div>

        {/* Right Column: Dynamic Daily Schedule Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-[420px] bg-white p-6 rounded-2xl border border-slate-200 shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Daily Schedule ({dayName})
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  {isWeekend ? 'Enjoy your weekend!' : 'No tasks scheduled today'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isWeekend ? 'Have a great rest!' : 'Use the generator below to populate slots.'}
                </span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {items.map(({ slot, cell }) => {
                  const colorConfig =
                    (PASTEL_COLORS as Record<string, typeof PASTEL_COLORS.blue>)[cell.color || 'blue'] ||
                    PASTEL_COLORS.blue;
                  const startDisplay = cell.eventStartTime || slot.startTime;
                  const endDisplay = cell.eventEndTime || slot.endTime;
                  return (
                    <div
                      key={cell.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
                    >
                      <div className="text-left truncate">
                        <span className="text-xs font-bold block truncate">{cell.subject}</span>
                        <span className="text-[10px] opacity-80 block truncate">
                          {formatTime(startDisplay)} - {formatTime(endDisplay)}
                          {cell.teacher ? ` • ${cell.teacher}` : ''}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 shadow-sm shrink-0">
                        Today
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
