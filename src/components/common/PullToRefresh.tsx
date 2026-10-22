import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { useLancamentosContext } from '../../context/LancamentosContext';

interface PullToRefreshProps {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function PullToRefresh({ children, containerRef }: PullToRefreshProps) {
  const { recarregar, isRefreshing } = useLancamentosContext();
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [refreshingState, setRefreshingState] = useState<boolean>(false);

  const startYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  pullDistanceRef.current = pullDistance;

  const PULL_THRESHOLD = 65; // pixels required to trigger refresh

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    // Only pull if scroll is at top
    if (el.scrollTop > 0) {
      isDraggingRef.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0) {
      // Resistance curve calculation
      const dist = Math.min(100, Math.pow(deltaY, 0.82));
      setPullDistance(dist);

      // Prevent native overscroll browser reload if pulling down
      if (dist > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [containerRef]);

  const triggerRefresh = useCallback(async () => {
    setRefreshingState(true);
    setPullDistance(PULL_THRESHOLD);
    try {
      await recarregar(false);
    } finally {
      setRefreshingState(false);
      setPullDistance(0);
    }
  }, [recarregar]);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullDistanceRef.current >= PULL_THRESHOLD && !refreshingState && !isRefreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [refreshingState, isRefreshing, triggerRefresh]);

  // Mouse drag support for desktop testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop <= 0) {
      startYRef.current = e.clientY;
      isDraggingRef.current = true;
    }
  }, [containerRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop > 0) {
      isDraggingRef.current = false;
      setPullDistance(0);
      return;
    }

    const deltaY = e.clientY - startYRef.current;
    if (deltaY > 0) {
      const dist = Math.min(100, Math.pow(deltaY, 0.82));
      setPullDistance(dist);
    } else {
      setPullDistance(0);
    }
  }, [containerRef]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullDistanceRef.current >= PULL_THRESHOLD && !refreshingState && !isRefreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [refreshingState, isRefreshing, triggerRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);

      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  const isRefreshingActive = isRefreshing || refreshingState;
  const showPullIndicator = pullDistance > 0 || isRefreshingActive;
  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div className="relative w-full min-h-full flex flex-col">
      {/* Pull to refresh top indicator bar */}
      {showPullIndicator && (
        <div
          className="w-full flex justify-center items-center overflow-hidden transition-all duration-200 ease-out z-30 pointer-events-none select-none py-1 shrink-0"
          style={{
            height: `${isRefreshingActive ? 52 : pullDistance}px`,
            opacity: isRefreshingActive ? 1 : Math.min(1, progress * 1.2),
          }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] text-xs font-medium">
            <RefreshCw
              size={15}
              className={`text-[var(--primary)] shrink-0 transition-transform ${
                isRefreshingActive ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshingActive
                  ? undefined
                  : `rotate(${progress * 180}deg)`,
              }}
            />
            <span>
              {isRefreshingActive
                ? 'Atualizando...'
                : progress >= 1
                ? 'Solte para atualizar'
                : 'Puxe para atualizar'}
            </span>
            {!isRefreshingActive && progress < 1 && (
              <ArrowDown size={13} className="text-[var(--text-secondary)] animate-bounce" />
            )}
          </div>
        </div>
      )}

      {/* Main children content */}
      <div className="w-full flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
