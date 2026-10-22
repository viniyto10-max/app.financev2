import React, { useEffect } from 'react';
import { useLancamentosContext } from '../../context/LancamentosContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastNotification() {
  const { toast, clearToast } = useLancamentosContext();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const bgStyles = {
    success: 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-emerald-500/20',
    error: 'bg-rose-600 dark:bg-rose-700 text-white shadow-rose-500/20',
    info: 'bg-blue-600 dark:bg-blue-700 text-white shadow-blue-500/20',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[toast.type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm pointer-events-none transition-all duration-300">
      <div className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg border border-white/10 ${bgStyles} backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-200`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={18} className="shrink-0" />
          <span className="text-xs font-semibold truncate">{toast.message}</span>
        </div>
        <button
          onClick={clearToast}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
