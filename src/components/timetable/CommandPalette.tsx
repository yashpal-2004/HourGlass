import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Terminal, Trash2, Download, Save, Plus } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { exportToPNG, exportToPDF } from '../../lib/export';

export const CommandPalette: React.FC = () => {
  const { loadTemplate, clearAllCells, saveProject, addTimeSlot, addDay, cells, projectName, toggleCellSelection } =
    useTimetable();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const actions = [
    { name: 'Load Complete Day Planner', category: 'Templates', icon: Sparkles, action: () => loadTemplate('completeday') },
    { name: 'Clear All Cells', category: 'Dangerous', icon: Trash2, action: clearAllCells },
    { name: 'Export as PNG Image', category: 'Export', icon: Download, action: () => exportToPNG('timetable-grid', projectName) },
    { name: 'Export as PDF Document', category: 'Export', icon: Download, action: () => exportToPDF('timetable-grid', projectName) },
    { name: 'Save Current Project', category: 'Save', icon: Save, action: saveProject },
    { name: 'Add Time Slot Row', category: 'Structure', icon: Plus, action: () => addTimeSlot() },
    { name: 'Add Day Column', category: 'Structure', icon: Plus, action: () => addDay('New Day') },
  ];

  const activeSubjects = Array.from(
    new Set(Object.values(cells).map(c => c.subject).filter(s => s && s.trim() !== '')),
  ).map(sub => ({
    name: `Find subject: ${sub}`,
    category: 'Subjects',
    icon: Search,
    action: () => {
      const matchingCellIds = Object.keys(cells).filter(key => cells[key].subject === sub);
      matchingCellIds.forEach(id => toggleCellSelection(id, true));
    },
  }));

  const allItems = [...actions, ...activeSubjects];
  const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-[100] no-print">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Terminal className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Type a command or search subjects... (e.g. 'gym')"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
            autoFocus
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-50 border border-slate-100"
          >
            ESC
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No commands found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{item.name}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-primary bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span>↑↓</span> to navigate
            <span className="ml-2">↵</span> to select
          </span>
          <span>Press Cmd+K / Ctrl+K to close</span>
        </div>
      </div>
    </div>
  );
};
