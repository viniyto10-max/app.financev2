import React, { createContext, useContext, useState, useRef } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
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
  const [animatingDir, setAnimatingDir] = useState<'left' | 'right' | null>(null);

  // Armazenamento para rastrear início e distância de gestos (touch & pointer/mouse)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPointerDownRef = useRef(false);

  // 3 meses: anterior, atual (centro) e próximo
  const prevMonth = subMonths(currentDate, 1);
  const nextMonth = addMonths(currentDate, 1);

  const formatMonthLabel = (d: Date) => {
    const monthStr = format(d, 'MMM', { locale: ptBR });
    const capitalized = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    const yearStr = format(d, 'yy');
    return `${capitalized}/${yearStr}`;
  };

  const handlePrev = () => {
    if (animatingDir) return;
    setAnimatingDir('right');
    setTimeout(() => {
      setCurrentDate(prevMonth);
      setAnimatingDir(null);
    }, 220);
  };

  const handleNext = () => {
    if (animatingDir) return;
    setAnimatingDir('left');
    setTimeout(() => {
      setCurrentDate(nextMonth);
      setAnimatingDir(null);
    }, 220);
  };

  // Suporte a Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Deslocamento horizontal > 40px e maior que vertical para não atrapalhar scroll da página
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Deslizar para a DIREITA -> Mês Anterior
        handlePrev();
      } else {
        // Deslizar para a ESQUERDA -> Mês Próximo
        handleNext();
      }
    }
  };

  // Suporte a Mouse Drag / Pointer
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !touchStartRef.current) return;
    isPointerDownRef.current = false;
    const diffX = e.clientX - touchStartRef.current.x;
    const diffY = e.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div
      className="w-full max-w-full overflow-hidden select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div
        className="w-full flex items-center justify-between gap-1.5 transition-transform ease-out"
        style={{
          transitionDuration: animatingDir ? '220ms' : '0ms',
          transform:
            animatingDir === 'left'
              ? 'translateX(-12px)'
              : animatingDir === 'right'
              ? 'translateX(12px)'
              : 'translateX(0px)',
        }}
      >
        {/* Mês Anterior (Esquerda) */}
        <button
          type="button"
          onClick={handlePrev}
          className="flex-1 basis-1/3 min-w-0 h-10 px-1 rounded-full flex items-center justify-center text-xs font-medium text-white/70 transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis active:scale-95"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
          }}
          title={formatMonthLabel(prevMonth)}
        >
          {formatMonthLabel(prevMonth)}
        </button>

        {/* Mês Selecionado (Centro) */}
        <button
          type="button"
          className="flex-1 basis-1/3 min-w-0 h-10 px-1 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all cursor-default whitespace-nowrap overflow-hidden text-ellipsis shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            transform: 'scale(1.05)',
          }}
          title={formatMonthLabel(currentDate)}
        >
          {formatMonthLabel(currentDate)}
        </button>

        {/* Mês Próximo (Direita) */}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 basis-1/3 min-w-0 h-10 px-1 rounded-full flex items-center justify-center text-xs font-medium text-white/70 transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis active:scale-95"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
          }}
          title={formatMonthLabel(nextMonth)}
        >
          {formatMonthLabel(nextMonth)}
        </button>
      </div>
    </div>
  );
}
