import React from 'react';
import { CheckCircle2, RefreshCw, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useLancamentos } from '../../hooks/useLancamentos';

export const SyncStatusIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { syncStatus, lastSuccessfulSync, pendingCount, recarregar, isRefreshing } = useLancamentos();

  const formatDateLabel = (d: Date | null) => {
    if (!d) return 'Nunca';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `hoje às ${timeStr}`;
    return `${d.toLocaleDateString()} às ${timeStr}`;
  };

  if (compact) {
    switch (syncStatus) {
      case 'atualizando':
        return (
          <div className="flex items-center gap-1.5 text-xs text-white/90 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
            <RefreshCw size={12} className="animate-spin" />
            <span>Atualizando</span>
          </div>
        );
      case 'pendente':
        return (
          <div className="flex items-center gap-1.5 text-xs text-amber-100 bg-amber-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm" title={`${pendingCount} lançamento(s) pendente(s) localmente`}>
            <Clock size={12} />
            <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
          </div>
        );
      case 'falha':
        return (
          <button 
            type="button"
            onClick={() => recarregar()}
            className="flex items-center gap-1.5 text-xs text-red-100 bg-red-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm cursor-pointer hover:bg-red-500/40 transition-colors"
            title="Falha na sincronização. Clique para tentar novamente."
          >
            <XCircle size={12} />
            <span>Falha</span>
          </button>
        );
      case 'desatualizado':
        return (
          <button 
            type="button"
            onClick={() => recarregar()}
            className="flex items-center gap-1.5 text-xs text-yellow-100 bg-yellow-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm cursor-pointer hover:bg-yellow-500/40 transition-colors"
            title="Dados desatualizados. Clique para atualizar."
          >
            <AlertTriangle size={12} />
            <span>Desatualizado</span>
          </button>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-100 bg-emerald-500/25 px-2.5 py-1 rounded-full backdrop-blur-sm" title={`Última sincronização: ${formatDateLabel(lastSuccessfulSync)}`}>
            <CheckCircle2 size={12} />
            <span>Sincronizado</span>
          </div>
        );
    }
  }

  return (
    <div className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-sm flex items-center justify-between text-xs gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {syncStatus === 'atualizando' && <RefreshCw size={16} className="animate-spin text-blue-500 shrink-0" />}
        {syncStatus === 'sincronizado' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
        {syncStatus === 'pendente' && <Clock size={16} className="text-amber-500 shrink-0" />}
        {syncStatus === 'falha' && <XCircle size={16} className="text-red-500 shrink-0" />}
        {syncStatus === 'desatualizado' && <AlertTriangle size={16} className="text-yellow-500 shrink-0" />}

        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {syncStatus === 'atualizando' && 'Sincronizando com o Google Sheets...'}
            {syncStatus === 'sincronizado' && 'Sincronizado com o Google Sheets'}
            {syncStatus === 'pendente' && `Há ${pendingCount} lançamento${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`}
            {syncStatus === 'falha' && 'Não foi possível atualizar. Exibindo cache.'}
            {syncStatus === 'desatualizado' && 'Dados desatualizados (cache antigo)'}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] truncate">
            Última sincronização: {formatDateLabel(lastSuccessfulSync)}
          </span>
        </div>
      </div>

      {(syncStatus === 'falha' || syncStatus === 'desatualizado' || syncStatus === 'pendente') && (
        <button
          type="button"
          onClick={() => recarregar()}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer text-xs shrink-0"
        >
          {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
        </button>
      )}
    </div>
  );
};
