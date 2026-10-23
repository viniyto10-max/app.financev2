import { useState, useEffect } from 'react';
import { useLancamentos } from '../hooks/useLancamentos';

export const useChartAnimation = (animationKey: any) => {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { lancamentos } = useLancamentos();
  
  useEffect(() => {
    // Só anima se existirem dados
    if (lancamentos.length === 0) return;
    
    setShouldAnimate(true);
    const timer = setTimeout(() => setShouldAnimate(false), 700);
    
    return () => clearTimeout(timer);
  }, [animationKey, lancamentos.length]);
  
  return shouldAnimate;
};
