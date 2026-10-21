import React, { createContext, useContext, useState } from 'react';
import { format, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  return (
    <MonthContext.Provider value={{ currentDate, setCurrentDate }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) {
    console.warn('useMonth must be used within a MonthProvider. Falling back to default.');
    return {
      currentDate: new Date(),
      setCurrentDate: () => {}
    };
  }
  return context;
}

export function MonthChips() {
  const { currentDate, setCurrentDate } = useMonth();

  // Gerar lista de meses (ex: 6 meses para trás e 6 meses para frente para cobrir parcelas futuras)
  const months = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    months.push(d);
  }

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none py-1 scroll-snap-x items-center" style={{ scrollbarWidth: 'none' }}>
      {months.map((d) => {
        const isSelected = isSameMonth(d, currentDate);
        const isCurrentYear = d.getFullYear() === new Date().getFullYear();
        const label = format(d, 'MMM', { locale: ptBR }) + (isCurrentYear ? '' : `/${d.getFullYear().toString().slice(-2)}`);
        
        return (
          <button
            key={d.toISOString()}
            onClick={() => setCurrentDate(d)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer scroll-snap-align-start ${
              isSelected 
                ? 'bg-white text-[var(--primary)] shadow-sm scale-105' 
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            ref={(node) => {
              if (node && isSelected) {
                node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }
            }}
          >
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </button>
        );
      })}
    </div>
  );
}
