import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { TimetableProvider, useTimetable } from './context/TimetableContext';

// Layout components
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/layout/Hero';

// Timetable feature components
import { CommandPalette } from './components/timetable/CommandPalette';
import { Stats } from './components/timetable/Stats';
import { Sidebar } from './components/timetable/Sidebar';
import { Toolbar } from './components/timetable/Toolbar';
import { Grid } from './components/timetable/Grid';

const MainLayout: React.FC = () => {
  const { toast } = useTimetable();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Dynamic Command Palette */}
      <CommandPalette />

      {/* Sticky Navbar */}
      <Navbar />

      {/* Hero Header */}
      <Hero />

      {/* Main App Section */}
      <main id="generator" className="flex-grow max-w-[1400px] mx-auto px-8 py-8 w-full">
        {/* Statistics Bar */}
        <Stats />

        {/* Horizontal Panel Row (Templates, Saved, Categories) */}
        <div className="mb-8">
          <Sidebar />
        </div>

        {/* Full Width Timetable Section */}
        <div className="space-y-4">
          <Toolbar />
          <Grid />
        </div>
      </main>

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white border border-slate-200/80 px-4 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          <span className="text-xs font-semibold text-slate-700">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <TimetableProvider>
      <MainLayout />
    </TimetableProvider>
  );
}

export default App;
