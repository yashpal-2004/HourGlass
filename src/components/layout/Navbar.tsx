import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-8 py-5 transition-all duration-300 no-print">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div
          className="flex items-end gap-0.5 cursor-pointer select-none"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="font-extrabold text-2xl tracking-tighter text-[#111827]">
            Hourglass
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] mb-1.5" />
        </div>

        <div>
          <a
            href="https://trackyashpal.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold px-6 py-3 transition-colors"
          >
            Sleep Tracker
          </a>
        </div>
      </div>
    </nav>
  );
};
