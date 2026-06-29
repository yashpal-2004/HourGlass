import React, { useState, useEffect } from 'react';
import { useTimetable } from '../../context/TimetableContext';
import { LucideIcon } from '../ui/LucideIcon';
import { pastelColors, availableIcons } from '../../constants';
import type { TimetableCell } from '../../types';
import { X, Copy, Trash2, Edit2, Plus } from 'lucide-react';
import { 
  resolveCellsForSlot as resolveCellsForSlotUtil, 
  resolveCell as resolveCellUtil, 
  getDayStats as getDayStatsUtil 
} from '../../utils/timetableUtils';

export const Grid: React.FC = () => {
  const {
    slots,
    days,
    cells,
    setCell,
    setCellEveryDay,
    getDayDateKey,
    clearCell,
    clearThisEvent,
    updateTimeSlot,
    removeDay,
    updateDay,
    selectedCellIds,
    toggleCellSelection,
    clearSelection,
    showToast,
    currentDate,
    formatTime,
    getDayDate,
    isLoading,
    pendingAddEvent,
    consumeAddEvent,
  } = useTimetable();

  const getDayStats = (dayId: string) => getDayStatsUtil(dayId, cells, slots, currentDate);

  // Cell Editing Modal State
  const [editingCell, setEditingCell] = useState<{ slotId: string; dayId: string; cellId?: string; isNew?: boolean; isFromToolbar?: boolean } | null>(null);
  const [selectedDayDetailId, setSelectedDayDetailId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [cellColor, setCellColor] = useState('blue');
  const [cellIcon, setCellIcon] = useState('BookOpen');
  const [categoryType, setCategoryType] = useState<'academic' | 'study' | 'routine' | 'waste'>('academic');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatScope, setRepeatScope] = useState<'thisDay' | 'everyday'>('thisDay');
  // Tracks the chosen date when the modal is opened from the toolbar Add Event button
  const [selectedDate, setSelectedDate] = useState<string>('');



  // Inline Row/Column Edit States
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [tempSlotTimes, setTempSlotTimes] = useState({ start: '', end: '' });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    slotId: string;
    dayId: string;
    cellId?: string;
  } | null>(null);

  const resolveCellsForSlot = (slotId: string, dayId: string) => resolveCellsForSlotUtil(slotId, dayId, cells, currentDate);
  const resolveCell = (slotId: string, dayId: string) => resolveCellUtil(slotId, dayId, cells, currentDate);

  // Calculate vertical row spans for adjacent matching cells in each day column
  const getCellSpans = () => {
    const spans: Record<string, number> = {};
    const hidden: Record<string, boolean> = {};

    days.forEach((day) => {
      let i = 0;
      while (i < slots.length) {
        const slot = slots[i];
        const cellId = `${slot.id}-${day.id}`;
        const cell = resolveCell(slot.id, day.id);

        if (!cell || !cell.subject || cell.subject.trim() === '') {
          i++;
          continue;
        }

        // Find how many consecutive slots have the exact same cell details
        let span = 1;
        let j = i + 1;
        while (j < slots.length) {
          const nextSlot = slots[j];
          const nextCellId = `${nextSlot.id}-${day.id}`;
          const nextCell = resolveCell(nextSlot.id, day.id);

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
            hidden[nextCellId] = true;
            j++;
          } else {
            break;
          }
        }

        spans[cellId] = span;
        i = j; // Skip past the spanned cells
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



  // Copied Cell State (for copy/paste shortcut)
  const [copiedCellData, setCopiedCellData] = useState<Partial<TimetableCell> | null>(null);

  // Get active unique subjects for fast details population
  const getSubjectSuggestions = () => {
    const suggestions: Record<string, {
      subject: string;
      teacher: string;
      room: string;
      notes: string;
      color: string;
      iconName: string;
      categoryType: string;
    }> = {};

    Object.values(cells).forEach(cell => {
      if (cell.subject && cell.subject.trim() !== '') {
        const key = cell.subject.trim();
        if (!suggestions[key] || (!suggestions[key].teacher && cell.teacher)) {
          suggestions[key] = {
            subject: cell.subject,
            teacher: cell.teacher || '',
            room: cell.room || '',
            notes: cell.notes || '',
            color: cell.color || 'blue',
            iconName: cell.iconName || 'BookOpen',
            categoryType: cell.categoryType || 'academic'
          };
        }
      }
    });

    return Object.values(suggestions);
  };

  // Handle click outside to close menus and clear selection
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      setContextMenu(null);
      // Clear selection if click is outside the grid table
      const gridElement = document.getElementById('timetable-grid');
      if (gridElement && !gridElement.contains(e.target as Node)) {
        clearSelection();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [clearSelection]);

  // Helper to gather all cells inside a spanned table block, filtering duplicate merged cells.
  // Two cells with different IDs but identical span-merge fields (subject/teacher/room/notes/color)
  // represent the same recurring event across slots — only keep the first occurrence.
  const getCellsInBlock = (startSlotId: string, span: number, dayId: string) => {
    const slotIndex = slots.findIndex(s => s.id === startSlotId);
    const coveredSlotIds = slots.slice(slotIndex, slotIndex + span).map(s => s.id);

    const blockCells: TimetableCell[] = [];
    const seenCellIds = new Set<string>();
    // Fingerprint for non-custom-time cells: same subject+teacher+room+notes+color = same card
    const seenSpanFingerprints = new Set<string>();

    coveredSlotIds.forEach(slotId => {
      const slotCells = resolveCellsForSlot(slotId, dayId);
      slotCells.forEach(cell => {
        if (!cell || !cell.subject || cell.subject.trim() === '') return;

        // Always deduplicate by exact cell id first
        if (seenCellIds.has(cell.id)) return;
        seenCellIds.add(cell.id);

        // For cells WITHOUT custom times, also deduplicate by span-merge fingerprint.
        // This prevents two template cells (e.g. s2-mon and s3-mon, both "WEBSITE") from
        // both appearing as separate cards inside the same merged block.
        if (!cell.eventStartTime && !cell.eventEndTime) {
          const fingerprint = [
            cell.subject,
            cell.teacher || '',
            cell.room || '',
            cell.notes || '',
            cell.color || '',
            cell.iconName || '',
            cell.categoryType || '',
          ].join('|');
          if (seenSpanFingerprints.has(fingerprint)) return;
          seenSpanFingerprints.add(fingerprint);
        }

        blockCells.push(cell);
      });
    });

    return blockCells;
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
      }

      // Delete/Backspace to clear selected cells
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCellIds.length > 0) {
        // FIX Bug 7: skip Sleep cells — they are read-only runtime entries
        const nonSleepIds = selectedCellIds.filter(id => {
          const c = cells[id];
          return !c || c.subject !== 'Sleep';
        });
        if (nonSleepIds.length === 0) {
          showToast('Sleep logs are read-only and cannot be deleted here.', 'info');
        } else {
          nonSleepIds.forEach(id => {
            const [slotId, dayId] = id.split('-');
            clearCell(slotId, dayId);
          });
          clearSelection();
          showToast('Selected cells cleared');
        }
      }

      // Ctrl + C to copy cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCellIds.length === 1) {
        const cellId = selectedCellIds[0];
        const cell = cells[cellId];
        if (cell) {
          setCopiedCellData(cell);
          showToast('Copied cell data');
        }
      }

      // Ctrl + V to paste cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && selectedCellIds.length > 0 && copiedCellData) {
        selectedCellIds.forEach(id => {
          const [slotId, dayId] = id.split('-');
          setCell(slotId, dayId, {
            subject: copiedCellData.subject,
            teacher: copiedCellData.teacher,
            room: copiedCellData.room,
            notes: copiedCellData.notes,
            color: copiedCellData.color,
            iconName: copiedCellData.iconName,
            categoryType: copiedCellData.categoryType || 'academic',
          });
        });
        showToast('Pasted cell data');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellIds, cells, copiedCellData]);

  // Consume the "Add Event" signal fired from the Toolbar.
  // Picks today's day column (falling back to Mon) and the first slot,
  // then opens the edit modal as a brand-new cell scoped to today's date.
  useEffect(() => {
    if (!pendingAddEvent) return;
    consumeAddEvent();

    // Resolve today's dayId from the days array
    const todayIndex = new Date().getDay(); // 0=Sun … 6=Sat
    const jsToId = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayId = jsToId[todayIndex];
    const targetDay = days.find(d => d.id === todayId) ?? days[0];
    if (!targetDay || slots.length === 0) return;

    // Pick the first slot of the day as the default
    const firstSlot = slots[0];
    const resolvedCellId = `${firstSlot.id}-${targetDay.id}`;

    // Today's date as YYYY-MM-DD using local calendar date (not UTC) to match what the user sees
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);

    // Pre-fill form state exactly like handleCellClick for a new cell
    setIsReadOnly(false);
    setRepeatWeekly(false);
    setRepeatScope('everyday');
    setSubject('');
    setTeacher('');
    setRoom('');
    setNotes('');
    setCellColor('blue');
    setCellIcon('BookOpen');
    setCategoryType('academic');
    setStartTime(firstSlot.startTime);
    setEndTime(firstSlot.endTime);
    setEditingCell({ slotId: firstSlot.id, dayId: targetDay.id, cellId: resolvedCellId, isNew: true, isFromToolbar: true });
  }, [pendingAddEvent]);

  const handleCellClick = (
    slotId: string,
    dayId: string,
    e?: React.MouseEvent,
    specificCellId?: string,
    forceNew = false,
    customStart?: string,
    customEnd?: string
  ) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      toggleCellSelection(`${slotId}-${dayId}`, true);
      return;
    }

    const cell = forceNew ? null : (specificCellId ? cells[specificCellId] : resolveCell(slotId, dayId));
    const resolvedCellId = cell?.id || `${slotId}-${dayId}`;

    setIsReadOnly(cell?.subject === 'Sleep');

    // Default: new cells repeat everyday, existing cells default to Today Only (repeatWeekly = false)
    const isNewCell = !cell || !cell.subject || cell.subject.trim() === '';
    if (isNewCell) {
      setRepeatWeekly(false);
      setRepeatScope('everyday');
    } else {
      setRepeatWeekly(!cell.dateKey);
      setRepeatScope('thisDay');
    }

    toggleCellSelection(resolvedCellId, false);
    setEditingCell({ slotId, dayId, cellId: resolvedCellId, isNew: isNewCell || forceNew });
    setSubject(cell?.subject || '');
    setTeacher(cell?.teacher || '');
    setRoom(cell?.room || '');
    setNotes(cell?.notes || '');
    setCellColor(cell?.color || 'blue');
    setCellIcon(cell?.iconName || 'BookOpen');
    setCategoryType(cell?.categoryType || 'academic');

    // Populate slot times â€” use custom event times if defined
    const currentSlot = slots.find(s => s.id === slotId);
    if (customStart && customEnd) {
      setStartTime(customStart);
      setEndTime(customEnd);
    } else if (cell && cell.eventStartTime && cell.eventEndTime) {
      setStartTime(cell.eventStartTime);
      setEndTime(cell.eventEndTime);
    } else if (currentSlot) {
      setStartTime(currentSlot.startTime);
      setEndTime(currentSlot.endTime);
    }
  };

  // Trigger direct save with chosen checkbox/radio scope
  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;
    saveWithScope(repeatWeekly ? repeatScope : 'today');
  };

  // Perform actual save with chosen scope
  const saveWithScope = (scope: 'today' | 'thisDay' | 'everyday') => {
    if (!editingCell) return;

    const cellData = {
      subject: subject.toUpperCase(),
      teacher: teacher.toUpperCase(),
      room: room.toUpperCase(),
      notes: notes.toUpperCase(),
      color: cellColor,
      iconName: cellIcon,
      categoryType,
      // Store custom times on the cell â€” never mutate the slot row definition
      eventStartTime: startTime,
      eventEndTime: endTime,
    };

    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const newStart = parseMins(startTime);
    const newEnd = parseMins(endTime);

    // Find all slots that overlap with the new time range
    const overlappingSlotIds = slots.filter(slot => {
      const sStart = parseMins(slot.startTime);
      const sEnd = parseMins(slot.endTime);
      return newStart < sEnd && newEnd > sStart;
    }).map(s => s.id);

    // Find all slots that were previously part of this spanned block
    const currentSlotIdx = slots.findIndex(s => s.id === editingCell.slotId);
    const baselineCellId = `${editingCell.slotId}-${editingCell.dayId}`;
    const span = spans[baselineCellId] || 1;
    const previousSlotIds = slots.slice(currentSlotIdx, currentSlotIdx + span).map(s => s.id);

    // We only update the first slot with the custom event times to preserve card layout
    const slotsToUpdate = overlappingSlotIds;
    // When opened from the toolbar, use the explicitly chosen date; otherwise use today.
    const dateKey = scope === 'today'
      ? (editingCell.isFromToolbar && selectedDate ? selectedDate : getDayDateKey(editingCell.dayId))
      : undefined;

    if (scope === 'today') {
      slotsToUpdate.forEach((slotId, index) => {
        const isFirst = index === 0;
        // FIX Bug 5: if eventStartTime changed, the old cell ID (which encodes the old
        // start time) differs from the new one. Delete the old ID first so no orphan remains.
        if (isFirst && !editingCell.isNew && editingCell.cellId) {
          const newTimeSuffix = startTime ? `-${startTime.replace(':', '')}` : '';
          const newId = `${slotId}-${editingCell.dayId}-${dateKey}${newTimeSuffix}`;
          if (editingCell.cellId !== newId) {
            clearCell(slotId, editingCell.dayId, dateKey, editingCell.cellId);
          }
        }
        setCell(slotId, editingCell.dayId, {
          ...cellData,
          eventStartTime: isFirst ? startTime : undefined,
          eventEndTime: isFirst ? endTime : undefined,
        }, (isFirst && !editingCell.isNew) ? editingCell.cellId : undefined, dateKey);
      });
      // Clear previously occupied slots that are no longer part of the event
      previousSlotIds.forEach(slotId => {
        if (!overlappingSlotIds.includes(slotId)) {
          clearCell(slotId, editingCell.dayId, dateKey, editingCell.cellId);
        }
      });
    } else if (scope === 'thisDay') {
      slotsToUpdate.forEach((slotId, index) => {
        const isFirst = index === 0;
        setCell(slotId, editingCell.dayId, {
          ...cellData,
          eventStartTime: isFirst ? startTime : undefined,
          eventEndTime: isFirst ? endTime : undefined,
        }, (isFirst && !editingCell.isNew) ? editingCell.cellId : undefined);
      });
      previousSlotIds.forEach(slotId => {
        if (!overlappingSlotIds.includes(slotId)) {
          clearCell(slotId, editingCell.dayId, undefined, editingCell.cellId);
        }
      });
    } else if (scope === 'everyday') {
      slotsToUpdate.forEach((slotId, index) => {
        const isFirst = index === 0;
        setCellEveryDay(slotId, {
          ...cellData,
          eventStartTime: isFirst ? startTime : undefined,
          eventEndTime: isFirst ? endTime : undefined,
        });
      });
      previousSlotIds.forEach(slotId => {
        if (!overlappingSlotIds.includes(slotId)) {
          days.forEach(day => {
            clearCell(slotId, day.id);
          });
        }
      });
    }

    setEditingCell(null);
    showToast('Changes saved successfully');
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, cellId: string) => {
    const cell = cells[cellId];
    if (cell && cell.subject === 'Sleep') {
      e.preventDefault();
      showToast('Sleep logs cannot be moved or dragged', 'info');
      return;
    }
    e.dataTransfer.setData('text/plain', cellId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSlotId: string, targetDayId: string) => {
    e.preventDefault();
    const targetCellId = `${targetSlotId}-${targetDayId}`;
    const targetCell = cells[targetCellId];
    if (targetCell && targetCell.subject === 'Sleep') {
      showToast('Cannot drop items onto sleep logs', 'info');
      return;
    }

    const sourceCellId = e.dataTransfer.getData('text/plain');
    if (!sourceCellId) return;

    const sourceCell = cells[sourceCellId];
    if (!sourceCell) return;

    // Safely parse slotId and dayId from the cell ID string
    const parts = sourceCellId.split('-');
    const dayIndex = parts.findIndex(p => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(p));
    
    let sourceSlotId = sourceCell.slotId;
    let sourceDayId = sourceCell.dayId;

    if (dayIndex !== -1) {
      sourceSlotId = parts.slice(0, dayIndex).join('-');
      sourceDayId = parts[dayIndex];
    } else {
      sourceSlotId = parts[0];
      sourceDayId = parts[1];
    }

    const sourceSlotIdx = slots.findIndex(s => s.id === sourceSlotId);
    const targetSlotIdx = slots.findIndex(s => s.id === targetSlotId);
    const baselineCellId = `${sourceSlotId}-${sourceDayId}`;
    const span = spans[baselineCellId] || 1;
    const sourceDateKey = parts.length > dayIndex + 1 ? parts.slice(dayIndex + 1).join('-') : undefined;

    // FIX Bug 2: move ALL span slots to target, clamped to array bounds.
    // Previously slots beyond index 1 were silently dropped when span > 2.
    const slotsAvailableAtTarget = slots.length - targetSlotIdx;
    const slotsToMove = Math.min(span, slotsAvailableAtTarget);

    for (let i = 0; i < slotsToMove; i++) {
      const currSourceSlotIdx = sourceSlotIdx + i;
      const currTargetSlotIdx = targetSlotIdx + i;
      if (currSourceSlotIdx >= slots.length) continue;

      const sSlot = slots[currSourceSlotIdx];
      const tSlot = slots[currTargetSlotIdx];

      const sCellId = sourceDateKey ? `${sSlot.id}-${sourceDayId}-${sourceDateKey}` : `${sSlot.id}-${sourceDayId}`;
      const sCell = cells[sCellId];
      if (!sCell) continue;

      setCell(tSlot.id, targetDayId, {
        subject: sCell.subject,
        teacher: sCell.teacher,
        room: sCell.room,
        notes: sCell.notes,
        color: sCell.color,
        iconName: sCell.iconName,
        categoryType: sCell.categoryType,
        eventStartTime: undefined,
        eventEndTime: undefined,
      }, undefined, sourceDateKey);

      if (sourceSlotId !== targetSlotId || sourceDayId !== targetDayId) {
        clearCell(sSlot.id, sourceDayId, sourceDateKey);
      }
    }

    // Also clear any remaining source slots that couldn't be placed at target
    for (let i = slotsToMove; i < span; i++) {
      const currSourceSlotIdx = sourceSlotIdx + i;
      if (currSourceSlotIdx >= slots.length) break;
      const sSlot = slots[currSourceSlotIdx];
      if (sourceSlotId !== targetSlotId || sourceDayId !== targetDayId) {
        clearCell(sSlot.id, sourceDayId, sourceDateKey);
      }
    }

    if (slotsToMove < span) {
      showToast('Span truncated — not enough rows at destination.', 'info');
    } else {
      showToast('Cell moved successfully');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent, slotId: string, dayId: string, cellId?: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      slotId,
      dayId,
      cellId
    });
  };



  // Compute target slot index + sub-slot time from mouse Y position within a row




  return (
    <div className="relative">
      {/* Detailed Day View Modal */}
      {/* Main Grid View */}
      <div id="timetable-grid" className="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-x-auto p-4 min-w-[700px] print-area">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-28 border-b border-slate-100">
                Time
              </th>
              {days.map((day) => {
                const { academicMins, studyMins, routineMins, wasteMins, freeMins } = getDayStats(day.id);
                const formatHours = (mins: number) => {
                  const hrs = mins / 60;
                  return Number.isInteger(hrs) ? `${hrs}h` : `${hrs.toFixed(1)}h`;
                };

                return (
                  <th key={day.id} className="p-3 text-left border-b border-slate-100 min-w-[95px] group/day relative">
                    {editingDayId === day.id ? (
                      <input
                        type="text"
                        value={day.name}
                        autoFocus
                        onChange={(e) => updateDay(day.id, e.target.value)}
                        onBlur={() => setEditingDayId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingDayId(null)}
                        className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-start w-full">
                          <span
                            className="text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 hover:text-primary px-1.5 py-0.5 rounded transition-all border border-transparent hover:border-slate-200/65"
                            onClick={() => setSelectedDayDetailId(day.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingDayId(day.id);
                            }}
                            title="Click to view details, Double-click to rename"
                          >
                            {day.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold px-1.5 select-none mb-1">
                            {getDayDate(day.id)}
                          </span>

                          {/* Compact statistics breakdown under the day header */}
                          <div className="mt-1 pt-1 border-t border-slate-100/60 w-full flex flex-col gap-0.5 text-[9px] font-bold select-none no-print">
                            {academicMins > 0 && (
                              <div className="flex items-center justify-between text-emerald-600 gap-1 leading-none">
                                <span>Work:</span>
                                <span>{formatHours(academicMins)}</span>
                              </div>
                            )}
                            {studyMins > 0 && (
                              <div className="flex items-center justify-between text-blue-600 gap-1 leading-none">
                                <span>Study:</span>
                                <span>{formatHours(studyMins)}</span>
                              </div>
                            )}
                            {routineMins > 0 && (
                              <div className="flex items-center justify-between text-purple-600 gap-1 leading-none">
                                <span>Routine:</span>
                                <span>{formatHours(routineMins)}</span>
                              </div>
                            )}
                            {wasteMins > 0 && (
                              <div className="flex items-center justify-between text-red-500 gap-1 leading-none">
                                <span>Waste:</span>
                                <span>{formatHours(wasteMins)}</span>
                              </div>
                            )}
                            {freeMins > 0 && (
                              <div className="flex items-center justify-between text-amber-600 gap-1 leading-none">
                                <span>Free:</span>
                                <span>{formatHours(freeMins)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeDay(day.id)}
                          className="opacity-0 group-hover/day:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500 no-print absolute right-1 top-3"
                          title="Remove Column"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr
                key={slot.id}
                data-slot-id={slot.id}
                data-slot-idx={slots.indexOf(slot)}
                className="group/row hover:bg-slate-50/40 transition-colors border-b border-slate-100"
              >
                {/* Time Slot column */}
                <td className="p-3 font-semibold text-slate-600 text-xs align-middle relative whitespace-nowrap">
                  {editingSlotId === slot.id ? (
                    <div className="flex flex-col gap-1 z-10 bg-white p-2 border border-slate-200 rounded-lg absolute left-0 top-0 shadow-lg">
                      <input
                        type="time"
                        value={tempSlotTimes.start}
                        onChange={(e) => setTempSlotTimes({ ...tempSlotTimes, start: e.target.value })}
                        className="text-xs border rounded p-0.5"
                      />
                      <input
                        type="time"
                        value={tempSlotTimes.end}
                        onChange={(e) => setTempSlotTimes({ ...tempSlotTimes, end: e.target.value })}
                        className="text-xs border rounded p-0.5"
                      />
                      <div className="flex justify-end gap-1 mt-1">
                        <button
                          onClick={() => {
                            updateTimeSlot(slot.id, tempSlotTimes.start, tempSlotTimes.end);
                            setEditingSlotId(null);
                          }}
                          className="bg-primary text-white text-[10px] px-2 py-0.5 rounded font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSlotId(null)}
                          className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span
                        className="cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 border border-dashed border-slate-200 hover:border-slate-400 rounded transition-colors text-[11px] block whitespace-nowrap text-center"
                        onClick={() => {
                          setTempSlotTimes({ start: slot.startTime, end: slot.endTime });
                          setEditingSlotId(slot.id);
                        }}
                        title="Click to edit time"
                      >
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </div>
                  )}
                </td>

                 {/* Day cell columns */}
                {days.map((day) => {
                  const cellId = `${slot.id}-${day.id}`;
                  if (hidden[cellId]) {
                    return null;
                  }
                  
                  const span = spans[cellId] || 1;
                  const blockCells = getCellsInBlock(slot.id, span, day.id);
                  const isSelected = selectedCellIds.includes(cellId);

                  // Clashing events side-by-side layout algorithm
                  const parseTime = (timeStr: string | undefined, defaultTime: string) => {
                    const [h, m] = (timeStr || defaultTime).split(':').map(Number);
                    return h + m / 60;
                  };

                  const isContinuousCard = (c: TimetableCell) => {
                    const prevSlotIndex = slots.findIndex(s => s.id === slot.id) - 1;
                    const nextSlotIndex = slots.findIndex(s => s.id === slot.id) + 1;
                    const hasPrev = prevSlotIndex >= 0 && Object.values(cells).some(oc => oc.dayId === day.id && oc.slotId === slots[prevSlotIndex].id && oc.subject === c.subject);
                    const hasNext = nextSlotIndex < slots.length && Object.values(cells).some(oc => oc.dayId === day.id && oc.slotId === slots[nextSlotIndex].id && oc.subject === c.subject);
                    return hasPrev || hasNext;
                  };

                  const parsedCards = blockCells.map(c => {
                    const start = parseTime(c.eventStartTime, slot.startTime);
                    const end = parseTime(c.eventEndTime, getBlockEndTime(slot.id, span));
                    return { cell: c, start, end, col: 0 };
                  });

                  parsedCards.sort((a, b) => {
                    const aCont = isContinuousCard(a.cell);
                    const bCont = isContinuousCard(b.cell);
                    if (aCont && !bCont) return -1;
                    if (!aCont && bCont) return 1;
                    return a.start - b.start || (b.end - b.start) - (a.end - a.start);
                  });

                  const hasSleepCard = parsedCards.some(c => c.cell.subject === 'Sleep');

                  // Build columns. Only pre-create col-0 if there IS a sleep card
                  // (sleep always owns col-0). Without sleep, start from an empty list
                  // so non-sleep cards begin at visual index 0.
                  const columnsList: Array<typeof parsedCards> = [];
                  if (hasSleepCard) columnsList.push([]); // reserve col-0 for Sleep

                  parsedCards.forEach(card => {
                    if (card.cell.subject === 'Sleep') {
                      // Sleep always goes into the first column (index 0)
                      if (columnsList.length === 0) columnsList.push([]);
                      card.col = 0;
                      columnsList[0].push(card);
                    } else {
                      // Start searching from col-1 if Sleep occupies col-0
                      let colIndex = hasSleepCard ? 1 : 0;
                      while (colIndex < columnsList.length) {
                        const colCards = columnsList[colIndex];
                        const hasOverlap = colCards.some(existingCard =>
                          card.start < existingCard.end && card.end > existingCard.start
                        );
                        if (!hasOverlap) {
                          break;
                        }
                        colIndex++;
                      }
                      if (colIndex === columnsList.length) {
                        columnsList.push([]);
                      }
                      card.col = colIndex;
                      columnsList[colIndex].push(card);
                    }
                  });

                  const activeColumns = columnsList.filter(col => col.length > 0);
                  const totalCols = activeColumns.length || 1;
                  // FIX Bug 1: compute max simultaneous overlap depth so cards that
                  // don't truly overlap each other each receive full width.
                  let maxOverlapDepth = 1;
                  parsedCards.forEach(cardA => {
                    let depth = 0;
                    parsedCards.forEach(cardB => {
                      if (cardA.start < cardB.end && cardA.end > cardB.start) depth++;
                    });
                    if (depth > maxOverlapDepth) maxOverlapDepth = depth;
                  });
                  const effectiveCols = Math.max(totalCols, maxOverlapDepth);

                  // Compute the minimum row height needed to show all sequential cards
                  // legibly. Each card needs at least 56px; overlapping cards share height.
                  const maxSequentialInAnyCol = columnsList.reduce((max, col) => {
                    // Count cards that are purely sequential (non-overlapping) in this column
                    const sorted = [...col].sort((a, b) => a.start - b.start);
                    const sequential = sorted.filter((card, i) =>
                      i === 0 || sorted[i - 1].end <= card.start + 0.001
                    ).length;
                    return Math.max(max, sequential);
                  }, 1);
                  const minRowHeight = Math.max(64, maxSequentialInAnyCol * 56);

                  return (
                    <td
                      key={day.id}
                      rowSpan={span}
                      className={`p-2 transition-all relative select-none align-top ${
                        isSelected ? 'ring-2 ring-primary/40 bg-primary/5' : ''
                      }`}
                      style={{ height: `${minRowHeight}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(slot.id, day.id, e);
                      }}
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, slot.id, day.id);
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, slot.id, day.id)}
                    >
                      <div className="absolute inset-2">
                          {/* 15-minute guide lines */}
                        <div className="absolute inset-0 pointer-events-none" aria-hidden>
                          {[25, 50, 75].map(pct => (
                            <div key={pct} className="absolute left-0 right-0 border-t border-slate-100/60" style={{ top: `${pct}%` }} />
                          ))}
                        </div>
                        {isLoading ? (
                          <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/50 flex flex-col justify-between p-3">
                            <div className="space-y-2">
                              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                              <div className="h-2.5 bg-slate-200/80 rounded w-1/2" />
                            </div>
                            <div className="h-2 bg-slate-200/60 rounded w-1/3" />
                          </div>
                        ) : (
                          columnsList.map((colCards, colIndex) => {
                            const cardWidth = 100 / effectiveCols;
                            const cardLeft = colIndex * cardWidth;

                            // Calculate unallocated gaps in this column
                            const sortedColCards = [...colCards].sort((a, b) => a.start - b.start);
                            const blockStart = parseTime(undefined, slot.startTime);
                            const blockEnd = parseTime(undefined, getBlockEndTime(slot.id, span));
                            
                            const colGaps: Array<{ start: number; end: number }> = [];
                            let current = blockStart;
                            sortedColCards.forEach(c => {
                              if (c.start > current + 0.01) {
                                colGaps.push({ start: current, end: c.start });
                              }
                              current = Math.max(current, c.end);
                            });
                            if (current < blockEnd - 0.01) {
                              colGaps.push({ start: current, end: blockEnd });
                            }

                            const blockDur = blockEnd - blockStart || 1;

                            // Detect whether any two cards in this column truly overlap in time.
                            // If none overlap, we use a flex-column layout so cards stack and
                            // share the row height proportionally — no pixel-height constraint.


                            return (
                              <React.Fragment key={colIndex}>
                                {/* Column wrapper — absolute, covers its slice of the cell width */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: `${cardLeft}%`,
                                    width: `calc(${cardWidth}% - 4px)`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                  }}
                                >
                                {/* Render Cards */}
                                {(() => {
                                  // Sort cards by start time for correct top-to-bottom order
                                  const sortedCards = [...colCards].sort((a, b) => a.start - b.start);

                                  // Build an interleaved list of gaps + cards for flex layout
                                  type FlexItem =
                                    | { type: 'card'; card: typeof sortedCards[0]; cardIdx: number }
                                    | { type: 'gap'; start: number; end: number };

                                  const items: FlexItem[] = [];
                                  let cursor = blockStart;
                                  sortedCards.forEach((card, ci) => {
                                    if (card.start > cursor + 0.001) {
                                      items.push({ type: 'gap', start: cursor, end: card.start });
                                    }
                                    items.push({ type: 'card', card, cardIdx: ci });
                                    cursor = Math.max(cursor, card.end);
                                  });
                                  if (cursor < blockEnd - 0.001) {
                                    items.push({ type: 'gap', start: cursor, end: blockEnd });
                                  }

                                  return items.map((item, itemIdx) => {
                                    const dur = item.type === 'card'
                                      ? item.card.end - item.card.start
                                      : item.end - item.start;
                                    const flexBasis = `${((dur / blockDur) * 100).toFixed(2)}%`;

                                    if (item.type === 'gap') {
                                      // Empty slot gap — show + button
                                      const formatMinsToString = (val: number) => {
                                        const h = Math.floor(val);
                                        const m = Math.round((val - h) * 60);
                                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                      };
                                      const gapStartStr = formatMinsToString(item.start);
                                      const gapEndStr = formatMinsToString(item.end);
                                      return (
                                        <div
                                          key={`gap-flex-${colIndex}-${itemIdx}`}
                                          className="border-2 border-dashed border-slate-100 hover:border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-300 hover:text-slate-400 transition-colors cursor-pointer group flex-shrink-0"
                                          style={{ flexBasis, minHeight: 0 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCellClick(slot.id, day.id, e, undefined, true, gapStartStr, gapEndStr);
                                          }}
                                        >
                                          <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      );
                                    }

                                    // Card item
                                    const card = item.card;
                                    const cardIdx = item.cardIdx;
                                    const bCell = card.cell;
                                    const bColorConfig = bCell.color
                                      ? (pastelColors as Record<string, typeof pastelColors.blue>)[bCell.color] || pastelColors.blue
                                      : pastelColors.blue;

                                    const cardHeightPct = (dur / blockDur) * 100;
                                    const showLabel = cardHeightPct >= 25;

                                    const isSleepSubject = bCell.subject === 'Sleep';
                                    const currentSlotIndex = slots.findIndex(s => s.id === slot.id);
                                    const prevSlotIdxOuter = currentSlotIndex - 1;
                                    const nextSlotIdxOuter = currentSlotIndex + span;

                                    const hasPrevContinuous = isSleepSubject && prevSlotIdxOuter >= 0 && Object.values(cells).some(c =>
                                      c.dayId === day.id && c.slotId === slots[prevSlotIdxOuter].id && c.subject === bCell.subject
                                    );
                                    const hasNextContinuous = isSleepSubject && nextSlotIdxOuter < slots.length && Object.values(cells).some(c =>
                                      c.dayId === day.id && c.slotId === slots[nextSlotIdxOuter].id && c.subject === bCell.subject
                                    );

                                    let roundedClass = 'rounded-2xl';
                                    let borderClass = '';
                                    // For sleep continuations use negative margins to bridge the gap
                                    const extraStyle: React.CSSProperties = {
                                      flexBasis,
                                      flexShrink: 0,
                                      minHeight: 0,
                                      zIndex: (hasPrevContinuous || hasNextContinuous) ? 20 : 10 + (sortedCards.length - cardIdx),
                                    };
                                    if (hasPrevContinuous && hasNextContinuous) {
                                      roundedClass = 'rounded-none';
                                      borderClass = 'border-t-0 border-b-0';
                                      extraStyle.marginTop = '-9px';
                                      extraStyle.marginBottom = '-9px';
                                      extraStyle.flexBasis = 'calc(' + flexBasis + ' + 18px)';
                                    } else if (hasPrevContinuous) {
                                      roundedClass = 'rounded-b-2xl rounded-t-none';
                                      borderClass = 'border-t-0';
                                      extraStyle.marginTop = '-9px';
                                      extraStyle.flexBasis = 'calc(' + flexBasis + ' + 9px)';
                                    } else if (hasNextContinuous) {
                                      roundedClass = 'rounded-t-2xl rounded-b-none';
                                      borderClass = 'border-b-0';
                                      extraStyle.marginBottom = '-9px';
                                      extraStyle.flexBasis = 'calc(' + flexBasis + ' + 9px)';
                                    }

                                    return (
                                      <div
                                        key={bCell.id}
                                        draggable={bCell.subject !== 'Sleep'}
                                        onDragStart={(e) => handleDragStart(e, bCell.id)}
                                        onClick={(e) => { e.stopPropagation(); handleCellClick(slot.id, day.id, e, bCell.id); }}
                                        onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, slot.id, day.id, bCell.id); }}
                                        className={`${roundedClass} border ${borderClass} text-left hover:shadow-sm transition-all duration-200 flex flex-col justify-between p-3 overflow-hidden ${bCell.subject === 'Sleep' ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${bColorConfig.bg} ${bColorConfig.border} ${bColorConfig.text}`}
                                        style={extraStyle}
                                      >
                                        {showLabel ? (
                                          <>
                                            {!hasPrevContinuous && (
                                              <div>
                                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                                  <span className="text-xs font-bold leading-tight block truncate">{bCell.subject}</span>
                                                  {bCell.iconName && <LucideIcon name={bCell.iconName} className="opacity-80 shrink-0" size={14} />}
                                                </div>
                                                {bCell.teacher && (
                                                  <div className="text-[10px] font-semibold opacity-75 truncate flex items-center gap-1">
                                                    <span>•</span> {bCell.teacher}
                                                  </div>
                                                )}
                                                {bCell.room && (
                                                  <div className="text-[10px] font-medium opacity-70 truncate flex items-center gap-1">
                                                    <span>•</span> {bCell.room}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {!hasNextContinuous && bCell.notes && (
                                              <div className="text-[9px] mt-2 italic opacity-60 truncate">{bCell.notes}</div>
                                            )}
                                          </>
                                        ) : !hasPrevContinuous ? (
                                          <div className="flex items-center justify-between h-full w-full">
                                            <span className="text-[9px] font-extrabold leading-none block truncate">{bCell.subject}</span>
                                            {bCell.iconName && <LucideIcon name={bCell.iconName} className="opacity-80 shrink-0" size={10} />}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  });
                                })()}
                                </div>

                                {/* Legacy absolute gap render for empty cells (no cards at all) */}
                                {blockCells.length === 0 && colGaps.map((gap, gapIdx) => {
                                  const topPct = ((gap.start - blockStart) / blockDur) * 100;
                                  const heightPct = ((gap.end - gap.start) / blockDur) * 100;
                                  const formatMinsToString = (val: number) => {
                                    const h = Math.floor(val);
                                    const m = Math.round((val - h) * 60);
                                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                  };
                                  return (
                                    <div
                                      key={`gap-${colIndex}-${gapIdx}`}
                                      className="absolute border-2 border-dashed border-slate-100 hover:border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-300 hover:text-slate-400 transition-colors cursor-pointer group"
                                      style={{
                                        top: `${topPct.toFixed(2)}%`,
                                        height: `calc(${heightPct.toFixed(2)}% - 4px)`,
                                        left: `${cardLeft}%`,
                                        width: `calc(${cardWidth}% - 4px)`,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCellClick(slot.id, day.id, e, undefined, true,
                                          formatMinsToString(gap.start), formatMinsToString(gap.end));
                                      }}
                                    >
                                      <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-white border border-slate-200 shadow-lg rounded-xl py-1 w-44 z-50 no-print"
        >
          <button
            onClick={() => {
              const cell = resolveCell(contextMenu.slotId, contextMenu.dayId);
              if (cell) {
                setCopiedCellData(cell);
                showToast('Cell data copied');
              }
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Cell
          </button>
          {copiedCellData && (
            <button
              onClick={() => {
                setCell(contextMenu.slotId, contextMenu.dayId, {
                  subject: copiedCellData.subject,
                  teacher: copiedCellData.teacher,
                  room: copiedCellData.room,
                  notes: copiedCellData.notes,
                  color: copiedCellData.color,
                  iconName: copiedCellData.iconName,
                  categoryType: copiedCellData.categoryType || 'academic',
                });
                showToast('Cell data pasted');
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Paste Cell
            </button>
          )}
          {(() => {
            const cell = resolveCell(contextMenu.slotId, contextMenu.dayId);
            const currentSlotIdx = slots.findIndex(s => s.id === contextMenu.slotId);
            if (!cell || !cell.subject || currentSlotIdx < 0) return null;

            // Find the end of the current span (skip all merged consecutive identical cells)
            let spanEnd = currentSlotIdx;
            while (spanEnd + 1 < slots.length) {
              const nextCell = resolveCell(slots[spanEnd + 1].id, contextMenu.dayId);
              if (
                nextCell &&
                nextCell.subject === cell.subject &&
                nextCell.teacher === cell.teacher &&
                nextCell.room === cell.room &&
                nextCell.notes === cell.notes &&
                nextCell.color === cell.color
              ) {
                spanEnd++;
              } else {
                break;
              }
            }

            // Determine where to start searching for the target:
            // If the slot immediately after spanEnd is empty, placing there would merge
            // with the original span. So we skip it and start from spanEnd+2.
            // If spanEnd+1 is occupied by a different event, it acts as a natural
            // separator and we search from spanEnd+1 onward for the first empty slot.
            const slotAfterSpan = spanEnd + 1 < slots.length
              ? resolveCell(slots[spanEnd + 1].id, contextMenu.dayId)
              : null;
            const isSlotAfterSpanEmpty = !slotAfterSpan || !slotAfterSpan.subject || slotAfterSpan.subject.trim() === '';

            // Start searching: skip spanEnd+1 if it's empty (needs to stay empty as gap)
            let targetIdx = isSlotAfterSpanEmpty ? spanEnd + 2 : spanEnd + 1;
            while (targetIdx < slots.length) {
              const tCell = resolveCell(slots[targetIdx].id, contextMenu.dayId);
              if (!tCell || !tCell.subject || tCell.subject.trim() === '') break;
              targetIdx++;
            }

            const targetSlot = targetIdx < slots.length ? slots[targetIdx] : null;
            if (!targetSlot) return null;

            return (
              <button
                onClick={() => {
                  setCell(targetSlot.id, contextMenu.dayId, {
                    subject: cell.subject,
                    teacher: cell.teacher,
                    room: cell.room,
                    notes: cell.notes,
                    color: cell.color,
                    iconName: cell.iconName,
                    categoryType: cell.categoryType || 'academic',
                  });
                  setContextMenu(null);
                  showToast('Cell duplicated');
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate Cell
              </button>
            );
          })()}
          <button
            onClick={() => {
              const targetCellId = contextMenu.cellId;
              const cell = targetCellId ? cells[targetCellId] : resolveCell(contextMenu.slotId, contextMenu.dayId);
              // FIX Bug 7: Sleep cells are read-only runtime entries — never delete them
              if (cell && cell.subject === 'Sleep') {
                showToast('Sleep logs are read-only and cannot be deleted here.', 'info');
                setContextMenu(null);
                return;
              }
              if (cell) {
                clearCell(contextMenu.slotId, contextMenu.dayId, cell.dateKey, cell.id);
              } else {
                clearCell(contextMenu.slotId, contextMenu.dayId);
              }
              setContextMenu(null);
              showToast('Cell cleared');
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cell
          </button>

          {/* Delete All â€” clears cells sharing the same subject in this row */}
          {(() => {
            const targetCellId = contextMenu.cellId;
            const cell = targetCellId ? cells[targetCellId] : resolveCell(contextMenu.slotId, contextMenu.dayId);
            if (!cell || !cell.subject) return null;
            return (
              <button
                onClick={() => {
                  const subject = cell.subject;
                  const slotId = contextMenu.slotId;
                  days.forEach(day => {
                    const slotCells = resolveCellsForSlot(slotId, day.id);
                    slotCells.forEach(sc => {
                      if (sc.subject === subject) {
                        clearCell(slotId, day.id, sc.dateKey, sc.id);
                      }
                    });
                  });
                  setContextMenu(null);
                  showToast(`"${subject}" events deleted in this row`);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All &ldquo;{cell.subject}&rdquo;
              </button>
            );
          })()}
          {/* Delete After This Day â€” clears cells sharing same subject from this day onward in this row */}
          {(() => {
            const targetCellId = contextMenu.cellId;
            const cell = targetCellId ? cells[targetCellId] : resolveCell(contextMenu.slotId, contextMenu.dayId);
            if (!cell || !cell.subject) return null;
            return (
              <button
                onClick={() => {
                  const subject = cell.subject;
                  const slotId = contextMenu.slotId;
                  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                  const startIdx = dayOrder.indexOf(contextMenu.dayId);
                  
                  if (startIdx !== -1) {
                    const targetDays = dayOrder.slice(startIdx);
                    targetDays.forEach(dId => {
                      const slotCells = resolveCellsForSlot(slotId, dId);
                      slotCells.forEach(sc => {
                        if (sc.subject === subject) {
                          clearCell(slotId, dId, sc.dateKey, sc.id);
                        }
                      });
                    });
                  }
                  setContextMenu(null);
                  showToast(`"${subject}" deleted from this day onward`);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete After This Day
              </button>
            );
          })()}
        </div>
      )}

      {/* Edit Cell Modal Dialog */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 no-print">
          <form
            onSubmit={handleSaveCell}
            className="bg-white border border-slate-950 rounded-none w-full max-w-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
          >
            <button
              type="button"
              onClick={() => setEditingCell(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 rounded-none"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Edit2 className="w-4 h-4 text-slate-900" />
              {isReadOnly ? 'View Time Slot Details' : editingCell.isFromToolbar ? 'Add New Event' : 'Edit Time Slot Details'}
            </h3>

            {/* ── Toolbar "Add Event" pickers: Day · Date · Start · End ──────── */}
            {editingCell.isFromToolbar && (
              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100">
                {/* Row 1: Day + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Day selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Day
                    </label>
                    <select
                      value={editingCell.dayId}
                      onChange={e => {
                        const newDayId = e.target.value;
                        setEditingCell(prev => prev ? { ...prev, dayId: newDayId, cellId: `${prev.slotId}-${newDayId}` } : prev);
                        // Sync the date picker to the matching date in the current week
                        const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                        const dayIndex = dayOrder.indexOf(newDayId);
                        const today = new Date();
                        const currentDay = today.getDay(); // 0=Sun
                        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
                        const monday = new Date(today);
                        monday.setDate(today.getDate() + diffToMonday);
                        const target = new Date(monday);
                        target.setDate(monday.getDate() + dayIndex);
                        const yyyy = target.getFullYear();
                        const mm = String(target.getMonth() + 1).padStart(2, '0');
                        const dd = String(target.getDate()).padStart(2, '0');
                        setSelectedDate(`${yyyy}-${mm}-${dd}`);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors uppercase tracking-wider bg-white h-[38px]"
                    >
                      {days.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date picker — defaults to today */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => {
                        const val = e.target.value; // always YYYY-MM-DD from the input
                        if (!val) return;
                        setSelectedDate(val);
                        // Parse parts directly — avoid Date constructor timezone shifts
                        const [y, m, d] = val.split('-').map(Number);
                        // JS Date month is 0-indexed; use UTC to avoid DST shifts
                        const picked = new Date(Date.UTC(y, m - 1, d));
                        const jsToId = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                        const pickedDayId = jsToId[picked.getUTCDay()];
                        const matchedDay = days.find(d => d.id === pickedDayId);
                        if (matchedDay) {
                          setEditingCell(prev => prev ? { ...prev, dayId: matchedDay.id, cellId: `${prev.slotId}-${matchedDay.id}` } : prev);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors h-[38px]"
                    />
                  </div>
                </div>

                {/* Row 2: Start Time + End Time (any duration, 5-min step) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={startTime}
                      onChange={e => {
                        setStartTime(e.target.value);
                        // Auto-advance slotId to the slot that contains this start time
                        if (e.target.value) {
                          const [h] = e.target.value.split(':').map(Number);
                          const best = slots.find(s => {
                            const [sh] = s.startTime.split(':').map(Number);
                            return sh === h;
                          }) ?? slots.find(s => {
                            const [sh] = s.startTime.split(':').map(Number);
                            const [eh] = s.endTime.split(':').map(Number);
                            return sh <= h && h < (eh || sh + 1);
                          }) ?? slots[0];
                          if (best) {
                            setEditingCell(prev => prev ? { ...prev, slotId: best.id, cellId: `${best.id}-${prev.dayId}` } : prev);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors h-[38px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Two-Column Form Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category / Event
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors uppercase tracking-wider disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                    placeholder="e.g. Work, Study, Sleep, Food"
                  />
                  {!isReadOnly && getSubjectSuggestions().length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Fill:</span>
                      {getSubjectSuggestions().map((s) => {
                        const colorConfig = (pastelColors as Record<string, typeof pastelColors.blue>)[s.color] || pastelColors.blue;
                        return (
                          <button
                            key={s.subject}
                            type="button"
                            onClick={() => {
                              setSubject(s.subject);
                              setTeacher(s.teacher);
                              setRoom(s.room);
                              setNotes(s.notes);
                              setCellColor(s.color);
                              setCellIcon(s.iconName);
                              setCategoryType(s.categoryType as 'academic' | 'study' | 'routine' | 'waste');
                            }}
                            className={`px-2 py-0.5 border text-[9px] font-bold transition-colors rounded-none uppercase tracking-wider ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
                          >
                            {s.subject}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Group / Classification
                  </label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-none w-full overflow-hidden">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setCategoryType('academic')}
                      style={categoryType === 'academic' ? { backgroundColor: '#059669', color: '#ffffff' } : {}}
                      className={`flex-1 text-center py-2 text-[9px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        categoryType === 'academic'
                          ? ''
                          : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      College / Work
                    </button>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setCategoryType('study')}
                      style={categoryType === 'study' ? { backgroundColor: '#2563eb', color: '#ffffff' } : {}}
                      className={`flex-1 text-center py-2 text-[9px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        categoryType === 'study'
                          ? ''
                          : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Self Study
                    </button>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setCategoryType('routine')}
                      style={categoryType === 'routine' ? { backgroundColor: '#9333ea', color: '#ffffff' } : {}}
                      className={`flex-1 text-center py-2 text-[9px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        categoryType === 'routine'
                          ? ''
                          : 'text-slate-500 hover:bg-purple-50 hover:text-purple-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Routine / Life
                    </button>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setCategoryType('waste')}
                      style={categoryType === 'waste' ? { backgroundColor: '#ef4444', color: '#ffffff' } : {}}
                      className={`flex-1 text-center py-2 text-[9px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        categoryType === 'waste'
                          ? ''
                          : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Time Waste
                    </button>
                  </div>
                </div>

                {/* Hide Start/End time inputs when opened from toolbar — the Time Slot dropdown already sets them */}
                {!editingCell?.isFromToolbar && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                    />
                  </div>
                </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors h-24 resize-none uppercase tracking-wider disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                    placeholder="e.g. Complete chapter homework before class"
                  />
                </div>

                {/* Repeat / Scoping Options inside the form */}
                {!isReadOnly && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={repeatWeekly}
                        onChange={(e) => setRepeatWeekly(e.target.checked)}
                        className="rounded-none border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Repeat Event</span>
                    </label>
                    
                    {repeatWeekly && (
                      <div className="flex gap-4 pl-5.5 transition-all">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <input
                            type="radio"
                            name="repeatScope"
                            value="thisDay"
                            checked={repeatScope === 'thisDay'}
                            onChange={() => setRepeatScope('thisDay')}
                            className="text-slate-900 focus:ring-slate-900 w-3 h-3"
                          />
                          <span>Every {days.find(d => d.id === editingCell.dayId)?.name || 'Day'}</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <input
                            type="radio"
                            name="repeatScope"
                            value="everyday"
                            checked={repeatScope === 'everyday'}
                            onChange={() => setRepeatScope('everyday')}
                            className="text-slate-900 focus:ring-slate-900 w-3 h-3"
                          />
                          <span>Everyday</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Teacher / Host
                    </label>
                    <input
                      type="text"
                      value={teacher}
                      onChange={(e) => setTeacher(e.target.value.toUpperCase())}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors uppercase tracking-wider disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                      placeholder="e.g. Dr. Sarah"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Room / Location
                    </label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value.toUpperCase())}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 transition-colors uppercase tracking-wider disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                      placeholder="e.g. Room 302"
                    />
                  </div>
                </div>

                {/* Color System Pastel Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(pastelColors).map((colorKey) => {
                      const colorVal = (pastelColors as Record<string, typeof pastelColors.blue>)[colorKey];
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => !isReadOnly && setCellColor(colorKey)}
                          className={`w-6 h-6 rounded-none border flex items-center justify-center transition-all ${
                            colorVal.bg
                          } ${colorVal.border} ${
                            cellColor === colorKey ? 'scale-110 ring-1 ring-slate-900' : 'opacity-85 hover:opacity-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={colorKey}
                        >
                          <span className={`w-2 h-2 rounded-none ${colorVal.dot}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon System Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Icon Category
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 border border-slate-200 p-2 rounded-none bg-slate-50">
                    {availableIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => !isReadOnly && setCellIcon(icon)}
                        className={`p-2 rounded-none flex items-center justify-center border transition-all ${
                          cellIcon === icon 
                            ? 'border-slate-950 bg-slate-950 text-white' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <LucideIcon name={icon} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
              {isReadOnly ? (
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-6 py-2.5 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-none transition-colors uppercase tracking-wider"
                >
                  Close Details
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cellId = `${editingCell.slotId}-${editingCell.dayId}`;
                      const span = spans[cellId] || 1;
                      if (span > 1) {
                        clearThisEvent(editingCell.slotId, editingCell.dayId);
                      } else {
                        const cell = resolveCell(editingCell.slotId, editingCell.dayId);
                        const dateKey = cell?.dateKey;
                        clearCell(editingCell.slotId, editingCell.dayId, dateKey);
                      }
                      setEditingCell(null);
                      showToast('Cell cleared');
                    }}
                    className="px-4 py-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50 border border-transparent rounded-none transition-colors uppercase tracking-wider"
                  >
                    Clear Cell
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-none transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-none transition-colors uppercase tracking-wider"
                  >
                    Apply Details
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Detailed Day View Modal */}
      {selectedDayDetailId && (() => {
        const day = days.find(d => d.id === selectedDayDetailId);
        if (!day) return null;

        // Calculate statistics using helper function
        const {
          totalMinutes,
          academicMins,
          studyMins,
          routineMins,
          wasteMins,
          freeMins
        } = getDayStats(day.id);

        const formatMins = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
        };

        const getPercentage = (mins: number) => {
          return ((mins / 1440) * 100).toFixed(1) + '%';
        };

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] no-print p-4">
            <div className="bg-white border border-slate-900 rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                    <LucideIcon name="Calendar" className="text-slate-900" size={18} />
                    {day.name} Schedule
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Detailed overview for {getDayDate(day.id)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayDetailId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-none transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Day Statistics Summary */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Time</div>
                  <div className="text-sm font-extrabold text-slate-700 mt-0.5">
                    {totalMinutes > 0 ? formatMins(totalMinutes) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400">({getPercentage(totalMinutes)})</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">College/Work</div>
                  <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                    {academicMins > 0 ? formatMins(academicMins) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-emerald-500/80">({getPercentage(academicMins)})</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Self Study</div>
                  <div className="text-sm font-extrabold text-blue-600 mt-0.5">
                    {studyMins > 0 ? formatMins(studyMins) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-blue-500/80">({getPercentage(studyMins)})</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routine/Life</div>
                  <div className="text-sm font-extrabold text-purple-600 mt-0.5">
                    {routineMins > 0 ? formatMins(routineMins) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-purple-500/80">({getPercentage(routineMins)})</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Waste</div>
                  <div className="text-sm font-extrabold text-red-600 mt-0.5">
                    {wasteMins > 0 ? formatMins(wasteMins) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-red-500/80">({getPercentage(wasteMins)})</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Free Time</div>
                  <div className="text-sm font-extrabold text-amber-600 mt-0.5">
                    {freeMins > 0 ? formatMins(freeMins) : '0h'}
                  </div>
                  <div className="text-[9px] font-bold text-amber-500/80">({getPercentage(freeMins)})</div>
                </div>
              </div>

              {/* Timeline Scrollable Area */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  interface TimelineItem {
                    isEvent: boolean;
                    startTime: string;
                    endTime: string;
                    slots: typeof slots;
                    cell?: typeof cells[string];
                  }

                  const timelineItems: TimelineItem[] = [];
                  const renderedEventKeys = new Set<string>();

                  let i = 0;
                  while (i < slots.length) {
                    const slot = slots[i];
                    const slotCells = resolveCellsForSlotUtil(slot.id, day.id, cells, currentDate);
                    const cell = slotCells[0];
                    const hasEvent = cell && cell.subject && cell.subject.trim() !== '';

                    if (hasEvent) {
                      if (cell.eventStartTime && cell.eventEndTime) {
                        const eventKey = `${cell.subject}-${cell.eventStartTime}-${cell.eventEndTime}`;
                        if (renderedEventKeys.has(eventKey)) {
                          i++;
                          continue;
                        }
                        renderedEventKeys.add(eventKey);
                        timelineItems.push({
                          isEvent: true,
                          startTime: cell.eventStartTime,
                          endTime: cell.eventEndTime,
                          slots: [slot],
                          cell
                        });
                        i++;
                      } else {
                        let j = i + 1;
                        const slotList = [slot];
                        while (j < slots.length) {
                           const nextSlot = slots[j];
                           const nextSlotCells = resolveCellsForSlotUtil(nextSlot.id, day.id, cells, currentDate);
                           const nextCell = nextSlotCells[0];
                          if (
                            nextCell &&
                            nextCell.subject === cell.subject &&
                            nextCell.teacher === cell.teacher &&
                            nextCell.room === cell.room &&
                            nextCell.notes === cell.notes &&
                            nextCell.color === cell.color &&
                            nextCell.categoryType === cell.categoryType &&
                            !nextCell.eventStartTime &&
                            !nextCell.eventEndTime
                          ) {
                            slotList.push(nextSlot);
                            j++;
                          } else {
                            break;
                          }
                        }
                        timelineItems.push({
                          isEvent: true,
                          startTime: slot.startTime,
                          endTime: slotList[slotList.length - 1].endTime,
                          slots: slotList,
                          cell
                        });
                        i = j;
                      }
                    } else {
                      let j = i + 1;
                      const slotList = [slot];
                      while (j < slots.length) {
                        const nextSlot = slots[j];
                        const nextSlotCells = resolveCellsForSlotUtil(nextSlot.id, day.id, cells, currentDate);
                        const nextCell = nextSlotCells[0];
                        const nextHasEvent = nextCell && nextCell.subject && nextCell.subject.trim() !== '';
                        if (!nextHasEvent) {
                          slotList.push(nextSlot);
                          j++;
                        } else {
                          break;
                        }
                      }
                      timelineItems.push({
                        isEvent: false,
                        startTime: slot.startTime,
                        endTime: slotList[slotList.length - 1].endTime,
                        slots: slotList
                      });
                      i = j;
                    }
                  }

                  return timelineItems.map((item, index) => {
                    const firstSlot = item.slots[0];
                    const hasEvent = item.isEvent && item.cell;
                    const colorConfig = hasEvent ? (pastelColors as Record<string, typeof pastelColors.blue>)[item.cell!.color] || pastelColors.blue : null;

                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(firstSlot.id, day.id, e, item.cell?.id);
                        }}
                        className={`group border p-4 transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-none ${
                          hasEvent 
                            ? `${colorConfig?.bg} ${colorConfig?.border} ${colorConfig?.text} hover:shadow-md` 
                            : 'bg-white border-dashed border-slate-200 hover:border-slate-400 text-slate-500 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Time Slot Details */}
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <LucideIcon name="Clock" className="opacity-60" size={14} />
                          <span className="text-xs font-bold whitespace-nowrap">
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          {hasEvent ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {item.cell!.iconName && <LucideIcon name={item.cell!.iconName} size={14} className="opacity-80 shrink-0" />}
                                <h4 className="text-xs font-extrabold uppercase tracking-wider truncate">
                                  {item.cell!.subject}
                                </h4>
                                {item.cell!.categoryType && (
                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 select-none">
                                    {item.cell!.categoryType === 'academic' 
                                      ? 'College/Work' 
                                      : item.cell!.categoryType === 'study' 
                                      ? 'Self Study' 
                                      : item.cell!.categoryType === 'waste' 
                                      ? 'Time Waste' 
                                      : 'Routine'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] opacity-75">
                                {item.cell!.teacher && (
                                  <span className="flex items-center gap-1">
                                    <LucideIcon name="User" size={10} />
                                    {item.cell!.teacher}
                                  </span>
                                )}
                                {item.cell!.room && (
                                  <span className="flex items-center gap-1">
                                    <LucideIcon name="MapPin" size={10} />
                                    {item.cell!.room}
                                  </span>
                                )}
                              </div>

                              {item.cell!.notes && (
                                <p className="text-[9px] mt-1.5 italic opacity-60 line-clamp-2">
                                  {item.cell!.notes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400">
                              <LucideIcon name="Plus" size={12} className="opacity-50" />
                              <span className="text-xs font-semibold italic">Free Time / No Events</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {(hasEvent ? item.cell!.subject !== 'Sleep' : true) && (
                          <div className="flex items-center justify-end shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDayDetailId(null);
                                setTimeout(() => handleCellClick(firstSlot.id, day.id, e as unknown as React.MouseEvent<HTMLTableCellElement>, item.cell?.id), 50);
                              }}
                              className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 border rounded-none opacity-0 group-hover:opacity-100 transition-opacity ${
                                hasEvent
                                  ? 'border-current bg-transparent hover:bg-black/5'
                                  : 'border-slate-300 hover:border-slate-400 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {hasEvent ? 'Edit Details' : 'Add Event'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDayDetailId(null)}
                  className="px-5 py-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-none transition-colors uppercase tracking-wider"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

