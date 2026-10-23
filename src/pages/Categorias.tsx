import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSameMonth, subMonths } from 'date-fns';
import { 
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Plus, Coffee, ShoppingBag, Wifi, Zap, Heart, BookOpen, Shirt, Tv, Fuel, Droplet, DollarSign, Briefcase, Tag, TrendingUp, TrendingDown, Dumbbell 
} from 'lucide-react';
import { useMonth, MonthChips } from '../components/common/MonthContext';
import { useLancamentos } from '../hooks/useLancamentos';
import { formatCurrency } from '../lib/utils';
import ResponsavelAvatar from '../components/common/ResponsavelAvatar';
import { FOTOS_RESPONSAVEIS } from '../lib/constants';
import { useChartAnimation } from '../hooks/useChartAnimation';

interface CategoryVisual {
  icon: any;
  colorHex: string;
  bgClass: string;
  textClass: string;
}

const CATEGORY_MAP: Record<string, CategoryVisual> = {
  'Academia': { icon: Dumbbell, colorHex: '#10B981', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-500' },
  'Alimentação': { icon: Coffee, colorHex: '#F97316', bgClass: 'bg-orange-500/15', textClass: 'text-orange-500' },
  'Mercado Livre': { icon: ShoppingBag, colorHex: '#EAB308', bgClass: 'bg-yellow-500/15', textClass: 'text-yellow-500' },
  'Internet': { icon: Wifi, colorHex: '#3B82F6', bgClass: 'bg-blue-500/15', textClass: 'text-blue-500' },
  'Energia': { icon: Zap, colorHex: '#FACC15', bgClass: 'bg-yellow-400/15', textClass: 'text-yellow-400' },
  'Saúde': { icon: Heart, colorHex: '#EF4444', bgClass: 'bg-red-500/15', textClass: 'text-red-500' },
  'Estudos': { icon: BookOpen, colorHex: '#A855F7', bgClass: 'bg-purple-500/15', textClass: 'text-purple-500' },
  'Vestuário': { icon: Shirt, colorHex: '#EC4899', bgClass: 'bg-pink-500/15', textClass: 'text-pink-500' },
  'Assinaturas digitais': { icon: Tv, colorHex: '#6366F1', bgClass: 'bg-indigo-500/15', textClass: 'text-indigo-500' },
  'Combustivel': { icon: Fuel, colorHex: '#6B7280', bgClass: 'bg-gray-500/15', textClass: 'text-gray-400' },
  'Combustível': { icon: Fuel, colorHex: '#6B7280', bgClass: 'bg-gray-500/15', textClass: 'text-gray-400' },
  'Àgua': { icon: Droplet, colorHex: '#38BDF8', bgClass: 'bg-sky-400/15', textClass: 'text-sky-400' },
  'Água': { icon: Droplet, colorHex: '#38BDF8', bgClass: 'bg-sky-400/15', textClass: 'text-sky-400' },
  'Salário': { icon: DollarSign, colorHex: '#10B981', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-500' },
};

const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  icon: Tag,
  colorHex: '#94A3B8',
  bgClass: 'bg-slate-500/15',
  textClass: 'text-slate-400'
};

const OUTRAS_VISUAL: CategoryVisual = {
  icon: Briefcase,
  colorHex: '#64748B',
  bgClass: 'bg-slate-600/15',
  textClass: 'text-slate-400'
};

const PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

export default function Categorias() {
  const navigate = useNavigate();
  const { currentDate } = useMonth();
  const { lancamentos, loading, erro } = useLancamentos();
  // 1. Controle "Saídas" (padrão) / "Entradas"
  const [tipoMovimento, setTipoMovimento] = useState<'Saída' | 'Entrada'>('Saída');

  // 2. Chips de responsável: "Todos" (padrão), "Ahyslla", "Marcos"
  const [responsavelFiltro, setResponsavelFiltro] = useState<'Todos' | string>('Todos');
  const shouldAnimate = useChartAnimation(tipoMovimento + responsavelFiltro + currentDate.getTime());

  const normalizeStr = (s: string) =>
    s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

  // Filtro de lançamentos para o mês atual selecionado
  const currentMonthTransactions = useMemo(() => {
    return lancamentos.filter((t) => {
      if (!isSameMonth(t.data_hora, currentDate)) return false;
      if (t.movimento !== tipoMovimento) return false;
      if (responsavelFiltro !== 'Todos') {
        const tResp = normalizeStr(t.responsavel || '');
        const fResp = normalizeStr(responsavelFiltro);
        if (!tResp.includes(fResp) && !fResp.includes(tResp)) return false;
      }
      return true;
    });
  }, [lancamentos, currentDate, tipoMovimento, responsavelFiltro]);

  // Filtro de lançamentos para o mês anterior (para cálculo de comparação vs. mês anterior)
  const prevMonthDate = useMemo(() => subMonths(currentDate, 1), [currentDate]);
  const prevMonthTransactions = useMemo(() => {
    return lancamentos.filter((t) => {
      if (!isSameMonth(t.data_hora, prevMonthDate)) return false;
      if (t.movimento !== tipoMovimento) return false;
      if (responsavelFiltro !== 'Todos') {
        const tResp = normalizeStr(t.responsavel || '');
        const fResp = normalizeStr(responsavelFiltro);
        if (!tResp.includes(fResp) && !fResp.includes(tResp)) return false;
      }
      return true;
    });
  }, [lancamentos, prevMonthDate, tipoMovimento, responsavelFiltro]);

  // Total acumulado no mês filtrado
  const totalMes = useMemo(() => {
    return currentMonthTransactions.reduce((acc, t) => acc + (t.valor || 0), 0);
  }, [currentMonthTransactions]);

  // Agrupamento por categoria no mês anterior para lookup rápido
  const prevMapByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of prevMonthTransactions) {
      const cat = (t.categoria || 'Sem categoria').trim();
      map.set(cat, (map.get(cat) || 0) + (t.valor || 0));
    }
    return map;
  }, [prevMonthTransactions]);

  // Agrupamento e cálculo por categoria no mês atual
  const categoriesList = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of currentMonthTransactions) {
      const cat = (t.categoria || 'Sem categoria').trim();
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += t.valor || 0;
      existing.count += 1;
      map.set(cat, existing);
    }

    const items = Array.from(map.entries()).map(([name, data]) => {
      const percentage = totalMes > 0 ? (data.total / totalMes) * 100 : 0;
      const prevTotal = prevMapByCat.get(name);
      
      let diffPercent: number | null = null;
      if (prevTotal !== undefined && prevTotal > 0) {
        diffPercent = Math.round(((data.total - prevTotal) / prevTotal) * 100);
      }

      const visual = CATEGORY_MAP[name] || DEFAULT_CATEGORY_VISUAL;

      return {
        name,
        total: data.total,
        count: data.count,
        percentage,
        prevTotal,
        diffPercent,
        visual
      };
    });

    // Ordenar do maior para o menor valor
    return items.sort((a, b) => b.total - a.total);
  }, [currentMonthTransactions, totalMes, prevMapByCat]);

  // Agrupamento para o gráfico de rosca (Top 5 + "Outras" se passarem de 6)
  const chartData = useMemo(() => {
    if (categoriesList.length === 0) return [];
    if (categoriesList.length <= 6) {
      return categoriesList.map((c, i) => ({
        name: c.name,
        value: c.total,
        color: c.visual.colorHex || PALETTE[i % PALETTE.length]
      }));
    }

    const top5 = categoriesList.slice(0, 5).map((c, i) => ({
      name: c.name,
      value: c.total,
      color: c.visual.colorHex || PALETTE[i % PALETTE.length]
    }));

    const outrasTotal = categoriesList.slice(5).reduce((acc, c) => acc + c.total, 0);
    return [
      ...top5,
      {
        name: 'Outras',
        value: outrasTotal,
        color: OUTRAS_VISUAL.colorHex
      }
    ];
  }, [categoriesList]);

  const responsaveisOptions = [
    { label: 'Todos', value: 'Todos', fullName: '' },
    { label: 'Ahyslla', value: 'Ahyslla', fullName: 'Ahyslla Vascaina' },
    { label: 'Marcos', value: 'Marcos', fullName: 'Marcos Andrade' }
  ];

  return (
    <div className="flex flex-col w-full min-h-full text-[var(--text-primary)]" style={{ paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom))' }}>
      {/* 1. Seletor de Meses da Visão Geral (adaptado ao fundo da página) */}
      <div className="px-4 pt-3 pb-2 w-full">
        <MonthChips variant="surface" />
      </div>

      <div className="px-4 space-y-4">
        {/* 2. Controle "Saídas" (padrão) / "Entradas" em pill */}
        <div className="w-full bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-full flex items-center shadow-sm fade-up" style={{ '--i': 1 } as React.CSSProperties}>
          <button
            type="button"
            onClick={() => setTipoMovimento('Saída')}
            className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-all flex items-center justify-center cursor-pointer ${
              tipoMovimento === 'Saída'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Saídas
          </button>
          <button
            type="button"
            onClick={() => setTipoMovimento('Entrada')}
            className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-all flex items-center justify-center cursor-pointer ${
              tipoMovimento === 'Entrada'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Entradas
          </button>
        </div>

        {/* 3. Chips de Responsável com Avatar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 fade-up" style={{ '--i': 2 } as React.CSSProperties}>
          {responsaveisOptions.map((opt) => {
            const isSelected = responsavelFiltro === opt.value;
            const fotoUrl = opt.fullName ? FOTOS_RESPONSAVEIS[opt.fullName] : undefined;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setResponsavelFiltro(opt.value)}
                className={`min-h-[44px] px-3.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
                }`}
              >
                {opt.fullName ? (
                  <ResponsavelAvatar
                    name={opt.fullName}
                    fotoUrl={fotoUrl}
                    size={24}
                  />
                ) : null}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Estado de Carregamento / Erro */}
        {loading && (
          <div className="p-6 text-center text-xs text-[var(--text-secondary)] animate-pulse">
            Carregando movimentações...
          </div>
        )}
        {erro && (
          <div className="p-3 text-center text-xs bg-red-500/10 border border-red-500/20 text-[var(--danger)] rounded-xl">
            {erro}
          </div>
        )}

        {/* 4. Gráfico de Rosca */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] fade-up" style={{ '--i': 3 } as React.CSSProperties}>
          {categoriesList.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              {/* Círculo cinza */}
              <div className="w-36 h-36 rounded-full border-8 border-slate-700/30 flex flex-col items-center justify-center p-3">
                <span className="text-[11px] font-medium text-[var(--text-secondary)] leading-snug">
                  Sem {tipoMovimento.toLowerCase()}s neste mês
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/novo')}
                className="mt-2 min-h-[44px] px-5 py-2.5 bg-[var(--primary)] text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Plus size={16} />
                <span>Adicionar lançamento</span>
              </button>
            </div>
          ) : (
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-full h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="transparent"
                      isAnimationActive={shouldAnimate}
                      animationDuration={450}
                      animationEasing="ease-out"
                      animationBegin={0}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Total']}
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>

                {/* Total no centro da rosca */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                    Total {tipoMovimento}s
                  </span>
                  <span className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                    {formatCurrency(totalMes)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Lista de Categorias (Do maior para o menor) */}
        {categoriesList.length > 0 && (
          <div className="space-y-2.5 fade-up" style={{ '--i': 4 } as React.CSSProperties}>
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Detalhamento ({categoriesList.length})
              </h2>
              <span className="text-xs text-[var(--text-secondary)]">
                % do total
              </span>
            </div>

            <div className="space-y-2">
              {categoriesList.map((cat) => {
                const IconComponent = cat.visual.icon;
                
                // Comparação vs. mês anterior:
                // Para Saída: aumento (positivo) = gastou mais (vermelho), queda = economizou (verde)
                // Para Entrada: aumento = recebeu mais (verde), queda = recebeu menos (vermelho)
                const isDiffPositive = (cat.diffPercent || 0) > 0;
                let diffColorClass = 'text-[var(--text-secondary)]';
                if (cat.diffPercent !== null && cat.diffPercent !== 0) {
                  if (tipoMovimento === 'Saída') {
                    diffColorClass = isDiffPositive ? 'text-[var(--danger)]' : 'text-[var(--primary)]';
                  } else {
                    diffColorClass = isDiffPositive ? 'text-[var(--primary)]' : 'text-[var(--danger)]';
                  }
                }

                return (
                  <div
                    key={cat.name}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Ícone e Nome da Categoria */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.visual.bgClass}`}
                        >
                          <IconComponent size={20} className={cat.visual.textClass} />
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className="text-sm font-bold truncate text-[var(--text-primary)]">
                            {cat.name}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                          </span>
                        </div>
                      </div>

                      {/* Valor, % e Variação */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-black text-[var(--text-primary)]">
                          {formatCurrency(cat.total)}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {cat.percentage.toFixed(1)}%
                          </span>
                          {cat.diffPercent !== null && (
                            <span className={`flex items-center font-bold text-[11px] ${diffColorClass}`}>
                              {cat.diffPercent > 0 ? (
                                <>
                                  <TrendingUp size={12} className="mr-0.5" />
                                  +{cat.diffPercent}%
                                </>
                              ) : cat.diffPercent < 0 ? (
                                <>
                                  <TrendingDown size={12} className="mr-0.5" />
                                  {cat.diffPercent}%
                                </>
                              ) : (
                                <span className="text-[var(--text-secondary)]">0%</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra de progresso fina */}
                    <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-transform duration-500 ease-out"
                        style={{
                          transform: `scaleX(${Math.min(1, cat.percentage / 100)})`,
                          transformOrigin: 'left',
                          backgroundColor: cat.visual.colorHex
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
