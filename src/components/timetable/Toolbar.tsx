import React, { useRef } from 'react';
import {
  Undo2, Redo2, Download, Trash2,
  FileJson, FileSpreadsheet, Image, FileText, Printer, Plus,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { exportToPNG, exportToPDF, exportToCSV } from '../../lib/export';

export const Toolbar: React.FC = () => {
  const {
    projectName,
    setProjectName,
    clearAllCells,
    undo,
    redo,
    canUndo,
    canRedo,
    slots,
    days,
    cells,
    exportJSON,
    is12HourFormat,
    setIs12HourFormat,
    currentDate,
    setCurrentDate,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    triggerAddEvent,
  } = useTimetable();

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthPickerRef = useRef<HTMLInputElement>(null);

  const openMonthPicker = () => {
    const input = monthPickerRef.current;
    if (!input) return;
    // showPicker() is the reliable cross-browser way to open native date pickers
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-none p-4 shadow-soft flex flex-wrap items-center gap-3 no-print mb-2">
      {/* Title Input */}
      <input
        type="text"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        className="px-4 py-3 border border-slate-300 rounded-none text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors w-full sm:w-56 uppercase tracking-wider h-[46px]"
        placeholder="TIMETABLE TITLE"
      />

      {/* Week Navigation */}
      <div className="flex items-center border border-slate-900 h-[46px] rounded-none bg-slate-50 overflow-hidden">
        <button
          onClick={goToPreviousWeek}
          className="h-full px-3.5 hover:bg-slate-900 hover:text-white text-slate-900 transition-colors font-bold text-sm border-r border-slate-900"
          title="Previous Week"
        >
          &larr;
        </button>

        {/* Month/year selector — button triggers showPicker() for reliable cross-browser support */}
        <button
          type="button"
          onClick={openMonthPicker}
          className="h-full flex items-center gap-2 px-3.5 select-none cursor-pointer hover:bg-slate-100 transition-colors border-none bg-transparent"
        >
          <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider whitespace-nowrap">
            {formatMonthYear(currentDate)}
          </span>
          <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider">
            Select
          </span>
        </button>
        <input
          ref={monthPickerRef}
          type="month"
          value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
          onChange={e => {
            if (e.target.value) {
              const [y, m] = e.target.value.split('-').map(Number);
              setCurrentDate(new Date(y, m - 1, 1));
            }
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          onClick={goToNextWeek}
          className="h-full px-3.5 hover:bg-slate-900 hover:text-white text-slate-900 transition-colors font-bold text-sm border-l border-slate-900"
          title="Next Week"
        >
          &rarr;
        </button>

        <button
          onClick={goToCurrentWeek}
          className="h-full px-3 hover:bg-slate-900 hover:text-white text-slate-900 transition-colors font-bold text-[9px] uppercase tracking-wider border-l border-slate-900"
          title="Today"
        >
          Today
        </button>
      </div>

      {/* Add Event — opens the Grid modal pre-filled with today */}
      <button
        type="button"
        onClick={triggerAddEvent}
        className="flex items-center gap-2 bg-[#111827] hover:bg-slate-700 text-white text-xs font-bold px-5 py-3 rounded-none uppercase tracking-widest transition-colors h-[46px] whitespace-nowrap border border-[#111827]"
        title="Add event to today"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Event
      </button>

      <div className="hidden lg:block flex-grow" />

      {/* Undo / Redo */}
      <div className="flex items-center border border-slate-900 bg-white h-[46px]">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="h-full px-3 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-800 transition-colors"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="h-full px-3 border-l border-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-800 transition-colors"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* 12h / 24h Toggle */}
      <button
        onClick={() => setIs12HourFormat(!is12HourFormat)}
        className="flex items-center justify-center gap-1.5 px-4 py-3 bg-transparent hover:bg-slate-50 border border-slate-900 rounded-none text-xs font-bold uppercase tracking-wider text-slate-800 transition-colors h-[46px] whitespace-nowrap"
      >
        {is12HourFormat ? 'Show 24h' : 'Show 12h'}
      </button>

      {/* Clear All */}
      <button
        onClick={clearAllCells}
        className="p-3 border border-slate-900 hover:bg-red-50 hover:text-red-600 text-slate-800 transition-colors rounded-none h-[46px]"
        title="Clear all events"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Export Dropdown */}
      <div className="relative group h-[46px]">
        <button className="flex items-center gap-2 bg-[#111827] hover:bg-slate-800 border border-[#111827] text-white text-xs font-bold px-5 py-3 rounded-none uppercase tracking-widest transition-colors h-full whitespace-nowrap">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>

        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-950 shadow-xl opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 rounded-none">
          <div className="p-1 space-y-0.5">
            <button
              onClick={() => exportToPNG('timetable-grid', projectName)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 text-left"
            >
              <Image className="w-3.5 h-3.5 text-blue-500" />
              Export as PNG
            </button>
            <button
              onClick={() => exportToPDF('timetable-grid', projectName)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 text-left"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              Export as PDF
            </button>
            <button
              onClick={() => exportToCSV(slots, days, cells, projectName)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 text-left"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Export as CSV
            </button>
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 text-left"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-500" />
              Export as JSON
            </button>
            <button
              onClick={() => window.print()}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 text-left border-t border-slate-100"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
