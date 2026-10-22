import React from 'react';
import ThemeToggle from './ThemeToggle';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface ScreenHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <header className="relative overflow-hidden w-full rounded-b-[28px] shadow-[0_8px_24px_rgba(0,0,0,.25)]" style={{ background: 'var(--header-gradient)' }}>
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full z-0" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full z-0" />

      <div className="relative z-10 flex flex-col pt-[max(20px,env(safe-area-inset-top))] pb-6 px-4 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <div className="text-white flex items-center justify-center">
                  {icon}
              </div>
            </div>
            <div className="flex flex-col text-white min-w-0">
              <h1 className="text-xl font-bold truncate">{title}</h1>
              <p className="text-xs opacity-80 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SyncStatusIndicator compact />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
