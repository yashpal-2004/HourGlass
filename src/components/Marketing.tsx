import React, { useState } from 'react';
import { 
  Laptop, ShieldAlert, Cpu, Sparkles, Keyboard, RefreshCw, 
  ChevronDown, ChevronUp 
} from 'lucide-react';

export const Features: React.FC = () => {
  const featuresList = [
    { icon: RefreshCw, title: 'Real-time Autosave', desc: 'Saves your schedules every 2 seconds to local storage so you never lose work.' },
    { icon: Laptop, title: 'Responsive Layout', desc: 'View, edit, and access schedules on your phone, tablet, or desktop smoothly.' },
    { icon: Cpu, title: 'Offline Mode', desc: 'No internet connection required. Your schedules are saved directly inside your browser.' },
    { icon: Sparkles, title: 'Pastel Themes', desc: 'Choose beautiful pastel color tones for classes, events, and categories.' },
    { icon: Keyboard, title: 'Keyboard Shortcuts', desc: 'Use Ctrl+C, Ctrl+V, Delete, and ESC key controls for ultra-fast scheduling.' },
    { icon: ShieldAlert, title: 'Local Privacy', desc: 'Your schedule data never leaves your device. Fully secure and private by default.' },
  ];

  return (
    <section id="features" className="py-16 bg-white border-t border-slate-200/80 no-print">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
          Designed for Modern Schedules
        </h2>
        <p className="text-slate-500 text-sm max-w-xl mx-auto mb-12">
          A premium suite of tools designed to make planning simple, responsive, and aesthetically outstanding.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((f, i) => (
            <div 
              key={i} 
              className="p-6 rounded-2xl border border-slate-100 hover:border-primary/10 hover:bg-slate-50/50 hover:shadow-soft transition-all duration-300 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FAQ: React.FC = () => {
  const faqs = [
    { q: 'How does the auto-save feature work?', a: 'Every change you make in the grid is automatically synchronized and saved to Firebase Firestore in real-time. You can refresh or return to the page at any time without losing progress.' },
    { q: 'Can I import plans created on other devices?', a: 'Yes! Export your timetable as a JSON file, send it to another device, and use the "Import JSON" button to restore your layout instantly.' },
    { q: 'How do I use the keyboard shortcuts?', a: 'Click once on a cell to select it. Press Ctrl+C to copy. Select another empty cell and press Ctrl+V to paste. Press Backspace or Delete to clear a cell, and Escape to clear selection.' },
    { q: 'How can I save as a PDF or PNG image?', a: 'Click the "Export" dropdown inside the toolbar. Select "Export as PDF" or "Export as PNG" to trigger a high-quality download of your timetable grid.' },
    { q: 'Is there a limit to slots or days?', a: 'No, Chronos supports adding unlimited rows (time slots) and columns (days). Feel free to build comprehensive weekly rosters.' }
  ];

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 bg-slate-50 border-t border-slate-200/80 no-print">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-10">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = activeIndex === i;
            return (
              <div 
                key={i} 
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200 shadow-soft"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 text-sm hover:bg-slate-50/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 border-t border-slate-50 text-xs text-slate-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200/80 py-16 px-8 no-print">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-end gap-0.5 select-none">
          <span className="font-extrabold text-xl tracking-tighter text-[#111827]">
            Hourglass
          </span>
          <span className="w-2 h-2 rounded-full bg-[#7C3AED] mb-1" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-500">
          <a href="#" className="hover:text-black hover:underline transition-all">Privacy</a>
          <a href="#" className="hover:text-black hover:underline transition-all">Terms</a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-black hover:underline transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
