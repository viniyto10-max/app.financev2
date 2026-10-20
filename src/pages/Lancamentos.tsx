import { useState, useMemo, useEffect } from 'react';
import ThemeToggle from '../components/common/ThemeToggle';
import { useLancamentos } from '../hooks/useLancamentos';
import { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  Search, X, Filter, ChevronRight, Calendar, ArrowUpCircle, ArrowDownCircle, 
  ShoppingBag, Wifi, Coffee, Heart, BookOpen, Shirt, Tv, Zap, Droplet, Fuel, DollarSign, Briefcase, RefreshCw 
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';

const getCategoryInfo = (categoria: string) => {
  const map: Record<string, { icon: any, color: string }> = {
    'Alimentação': { icon: Coffee, color: 'text-orange-500' },
    'Mercado Livre': { icon: ShoppingBag, color: 'text-yellow-500' },
    'Internet': { icon: Wifi, color: 'text-blue-500' },
    'Energia': { icon: Zap, color: 'text-yellow-400' },
    'Saúde': { icon: Heart, color: 'text-red-500' },
    'Estudos': { icon: BookOpen, color: 'text-purple-500' },
    'Vestuário': { icon: Shirt, color: 'text-pink-500' },
    'Assinaturas digitais': { icon: Tv, color: 'text-indigo-500' },
    'Combustivel': { icon: Fuel, color: 'text-gray-500' },
    'Àgua': { icon: Droplet, color: 'text-blue-400' },
    'Salário': { icon: DollarSign, color: 'text-green-600' },
  };
  return map[categoria] || { icon: Briefcase, color: 'text-[var(--text-secondary)]' };
};

export default function Lancamentos() {
  const { lancamentos, loading, erro, recarregar, lastUpdated } = useLancamentos();
  const [searchParams, setSearchParams] = useSearchParams();

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Entrada' | 'Saída'>('Todos');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Confirmados' | 'Pendentes'>(
    searchParams.get('status') === 'pendentes' ? 'Pendentes' : 'Todos'
  );
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBancos, setSelectedBancos] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<'recentes' | 'antigos' | 'maior_valor' | 'menor_valor'>('recentes');

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  // Extract unique options for filters
  const bancosList = useMemo(() => Array.from(new Set(lancamentos.map(t => t.banco).filter(Boolean))), [lancamentos]);
  const categoriasList = useMemo(() => Array.from(new Set(lancamentos.map(t => t.categoria).filter(Boolean))), [lancamentos]);
  const responsaveisList = useMemo(() => Array.from(new Set(lancamentos.map(t => t.responsavel).filter(Boolean))), [lancamentos]);

  // Filtering and sorting
  const filteredLancamentos = useMemo(() => {
    let result = [...lancamentos];

    // Busca sem acentos e maiúsculas/minúsculas
    if (busca.trim()) {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = normalize(busca);
      result = result.filter(t => 
        normalize(t.descricao || '').includes(q) ||
        normalize(t.categoria || '').includes(q) ||
        normalize(t.banco || '').includes(q) ||
        normalize(t.responsavel || '').includes(q)
      );
    }

    if (tipoFiltro !== 'Todos') {
      result = result.filter(t => t.movimento === tipoFiltro);
    }

    if (statusFiltro === 'Confirmados') {
      result = result.filter(t => t.confirmado === true);
    } else if (statusFiltro === 'Pendentes') {
      result = result.filter(t => t.confirmado === false);
    }

    if (selectedBancos.length > 0) {
      result = result.filter(t => selectedBancos.includes(t.banco));
    }
    if (selectedCategorias.length > 0) {
      result = result.filter(t => selectedCategorias.includes(t.categoria));
    }
    if (selectedResponsaveis.length > 0) {
      result = result.filter(t => selectedResponsaveis.includes(t.responsavel));
    }

    // Ordenação
    result.sort((a, b) => {
      const timeA = new Date(a.data_hora).getTime();
      const timeB = new Date(b.data_hora).getTime();
      if (ordem === 'recentes') return timeB - timeA;
      if (ordem === 'antigos') return timeA - timeB;
      if (ordem === 'maior_valor') return b.valor - a.valor;
      if (ordem === 'menor_valor') return a.valor - b.valor;
      return 0;
    });

    return result;
  }, [lancamentos, busca, tipoFiltro, statusFiltro, selectedBancos, selectedCategorias, selectedResponsaveis, ordem]);

  // Totais do resumo do filtro
  const resumo = useMemo(() => {
    const totalEntradas = filteredLancamentos.filter(t => t.movimento === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
    const totalSaidas = filteredLancamentos.filter(t => t.movimento === 'Saída').reduce((acc, t) => acc + t.valor, 0);
    return {
      count: filteredLancamentos.length,
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas
    };
  }, [filteredLancamentos]);

  // Agrupamento por dia
  const groupedByDay = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredLancamentos.slice(0, visibleCount).forEach(t => {
      const d = new Date(t.data_hora);
      const key = isValid(d) ? format(d, 'yyyy-MM-dd') : 'Outros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredLancamentos, visibleCount]);

  const formatDayHeader = (dateStr: string) => {
    if (dateStr === 'Outros') return 'Outros';
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "EEE, d 'de' MMM", { locale: ptBR });
  };

  const activeFiltersCount = selectedBancos.length + selectedCategorias.length + selectedResponsaveis.length;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <header className="py-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] flex justify-between items-center sticky top-0 z-40" style={{ background: 'var(--header-gradient)' }}>
        <h1 className="text-lg font-bold text-white">Lançamentos</h1>
        <ThemeToggle />
      </header>

      {/* Sticky Filter & Search Bar */}
      <div className="sticky top-[52px] z-30 bg-[var(--bg-app)] border-b border-[var(--border)] px-4 py-3 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="Buscar por descrição, categoria, forma de pagamento..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary)]"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtros em duas linhas organizadas */}
        <div className="space-y-2">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-0.5 flex-1">
              {(['Todos', 'Entrada', 'Saída'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setTipoFiltro(tipo)}
                  className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors cursor-pointer text-center truncate ${tipoFiltro === tipo ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                >
                  {tipo}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-xl border shrink-0 cursor-pointer ${activeFiltersCount > 0 ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'}`}
            >
              <Filter size={13} /> Filtros {activeFiltersCount > 0 && `· ${activeFiltersCount}`}
            </button>
          </div>

          <div className="flex bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-0.5 w-full">
            {(['Todos', 'Confirmados', 'Pendentes'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFiltro(status)}
                className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors cursor-pointer text-center truncate ${statusFiltro === status ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-32">
        {/* Resumo do filtro */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] text-[var(--text-secondary)]">Entradas</div>
            <div className="text-sm font-bold text-[var(--primary)]">+{formatCurrency(resumo.entradas)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-secondary)]">Saídas</div>
            <div className="text-sm font-bold text-[var(--danger)]">-{formatCurrency(resumo.saidas)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-secondary)]">Saldo</div>
            <div className={`text-sm font-bold ${resumo.saldo >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
              {formatCurrency(resumo.saldo)}
            </div>
          </div>
        </div>

        {/* Erro de leitura */}
        {erro && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-[var(--danger)]">Não foi possível atualizar.</span>
            <button onClick={recarregar} className="px-3 py-1 bg-[var(--primary)] text-white rounded-lg font-bold">Tentar de novo</button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(n => <div key={n} className="h-16 bg-[var(--bg-card)] rounded-xl" />)}
          </div>
        ) : filteredLancamentos.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-[var(--text-secondary)] text-sm">
              {lancamentos.length === 0 ? 'Nenhum lançamento ainda. Toque no + para criar o primeiro.' : 'Nenhum resultado para esses filtros'}
            </p>
            {lancamentos.length > 0 && (
              <button 
                onClick={() => { setBusca(''); setTipoFiltro('Todos'); setStatusFiltro('Todos'); setSelectedBancos([]); setSelectedCategorias([]); setSelectedResponsaveis([]); }}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-xs font-bold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([dateStr, items]) => {
              const dayTotal = items.reduce((sum, t) => sum + (t.movimento === 'Entrada' ? t.valor : -t.valor), 0);
              return (
                <div key={dateStr} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium text-[var(--text-secondary)] px-1">
                    <span>{formatDayHeader(dateStr)}</span>
                    <span className={dayTotal >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}>
                      {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(t => {
                      const { icon: Icon, color } = getCategoryInfo(t.categoria);
                      const isEntrada = t.movimento === 'Entrada';
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => setSelectedTransaction(t)}
                          className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 min-h-[64px] shadow-[var(--shadow)] cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <div className={`p-2.5 rounded-full ${isEntrada ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>
                            <Icon size={18} className={color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              <span className="truncate">{t.descricao || t.categoria}</span>
                              {!t.confirmado && (
                                <span className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded shrink-0">Pendente</span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {t.banco} · {t.categoria} · {t.responsavel}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold ${isEntrada ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                              {isEntrada ? '+' : '-'}{formatCurrency(t.valor)}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                              {isValid(new Date(t.data_hora)) ? format(new Date(t.data_hora), 'HH:mm') : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {visibleCount < filteredLancamentos.length && (
              <button 
                onClick={() => setVisibleCount(prev => prev + 30)}
                className="w-full py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-primary)]"
              >
                Carregar mais
              </button>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-[var(--text-secondary)] pt-4">
          Atualizado há {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)} minutos
        </div>
      </div>

      {/* Bottom Sheet de Filtros Avançados */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg-card)] border-t border-[var(--border)] w-full sm:max-w-[440px] rounded-t-[20px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base">Filtros Avançados</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-[var(--text-secondary)]"><X size={20}/></button>
            </div>

            {/* Ordenação */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Ordenar por</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'recentes', label: 'Mais recentes' },
                  { id: 'antigos', label: 'Mais antigos' },
                  { id: 'maior_valor', label: 'Maior valor' },
                  { id: 'menor_valor', label: 'Menor valor' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => setOrdem(o.id as any)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-left cursor-pointer ${ordem === o.id ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bancos */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Formas de pagamento</label>
              <div className="flex flex-wrap gap-1.5">
                {bancosList.map(b => {
                  const sel = selectedBancos.includes(b);
                  return (
                    <button
                      key={b}
                      onClick={() => setSelectedBancos(prev => sel ? prev.filter(x => x !== b) : [...prev, b])}
                      className={`px-3 py-1.5 text-xs rounded-xl border cursor-pointer ${sel ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'}`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorias */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Categorias</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {categoriasList.map(c => {
                  const sel = selectedCategorias.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => setSelectedCategorias(prev => sel ? prev.filter(x => x !== c) : [...prev, c])}
                      className={`px-3 py-1.5 text-xs rounded-xl border cursor-pointer ${sel ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Responsáveis */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Responsáveis</label>
              <div className="flex flex-wrap gap-1.5">
                {responsaveisList.map(r => {
                  const sel = selectedResponsaveis.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => setSelectedResponsaveis(prev => sel ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`px-3 py-1.5 text-xs rounded-xl border cursor-pointer ${sel ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'}`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setSelectedBancos([]); setSelectedCategorias([]); setSelectedResponsaveis([]); setOrdem('recentes'); }}
                className="flex-1 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-sm font-bold cursor-pointer"
              >
                Limpar tudo
              </button>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-bold cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet de Detalhes */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg-card)] border-t border-[var(--border)] w-full sm:max-w-[440px] rounded-t-[20px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base">Detalhes do Lançamento</h3>
              <button onClick={() => setSelectedTransaction(null)} className="text-[var(--text-secondary)]"><X size={20}/></button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Tipo</span>
                <span className={`font-bold ${selectedTransaction.movimento === 'Entrada' ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>{selectedTransaction.movimento}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Valor</span>
                <span className="font-bold">{formatCurrency(selectedTransaction.valor)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Data e Hora</span>
                <span>{isValid(new Date(selectedTransaction.data_hora)) ? format(new Date(selectedTransaction.data_hora), 'dd/MM/yyyy HH:mm') : ''}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Forma de pagamento</span>
                <span>{selectedTransaction.banco}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Categoria</span>
                <span>{selectedTransaction.categoria}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Responsável</span>
                <span>{selectedTransaction.responsavel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Status</span>
                <span>{selectedTransaction.confirmado ? 'Confirmado' : 'Pendente'}</span>
              </div>
              {selectedTransaction.descricao && (
                <div className="py-1">
                  <span className="text-[var(--text-secondary)] block mb-1">Descrição</span>
                  <p className="p-3 bg-[var(--bg-input)] rounded-xl text-xs">{selectedTransaction.descricao}</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedTransaction(null)}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
