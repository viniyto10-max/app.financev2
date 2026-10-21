import React, { createContext, useContext, useState, useRef, useLayoutEffect } from 'react';
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
  const boxRef = useRef<HTMLDivElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);

  // Gerar lista de meses (ex: 6 meses para trás e 6 meses para frente para cobrir parcelas futuras)
  const months: Date[] = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    months.push(d);
  }

  // Centralizar o mês selecionado rolando APENAS o contêiner da linha de chips (sem scrollIntoView)
  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = selectedChipRef.current;
    if (box && el) {
      box.scrollTo({
        left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2,
        behavior: 'auto'
      });
    }
  }, [currentDate]);

  return (
    <div
      ref={boxRef}
      className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-[6px] py-1 scrollbar-none items-center"
      style={{
        scrollbarWidth: 'none',
        scrollSnapType: 'x proximity',
        overscrollBehaviorX: 'contain',
        touchAction: 'pan-x'
      }}
    >
      {months.map((d) => {
        const isSelected = isSameMonth(d, currentDate);
        const isCurrentYear = d.getFullYear() === new Date().getFullYear();
        const label = format(d, 'MMM', { locale: ptBR }) + (isCurrentYear ? '' : `/${d.getFullYear().toString().slice(-2)}`);

        return (
          <button
            key={d.toISOString()}
            ref={isSelected ? selectedChipRef : null}
            onClick={() => setCurrentDate(d)}
            className={`flex-none shrink-0 whitespace-nowrap px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer scroll-snap-align-start ${
              isSelected
                ? 'bg-white text-[var(--primary)] shadow-sm scale-105'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </button>
        );
      })}
    </div>
  );
}
