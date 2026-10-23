import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  format,
  getDate,
  getDaysInMonth,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid, 
  Line, 
  Area, 
  ComposedChart,
  Legend,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Percent, 
  Plus, 
  AlertCircle,
  CreditCard,
  Award,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useLancamentos } from '../hooks/useLancamentos';
import { useChartAnimation } from '../hooks/useChartAnimation';
import { formatCurrency, getDataExibicao } from '../lib/utils';
import ResponsavelAvatar from '../components/common/ResponsavelAvatar';
import { FOTOS_RESPONSAVEIS, CARTOES, isCartao, matchCartao, getCartaoVisual } from '../lib/constants';

type PeriodoTipo = '3_meses' | '6_meses' | '12_meses' | 'ano_atual';

interface PeriodoOption {
  id: PeriodoTipo;
  label: string;
}

const PERIODOS: PeriodoOption[] = [
  { id: '3_meses', label: '3 meses' },
  { id: '6_meses', label: '6 meses' },
  { id: '12_meses', label: '12 meses' },
  { id: 'ano_atual', label: 'Ano atual' },
];

export default function Analises() {
  const navigate = useNavigate();
  const { lancamentos, loading, erro } = useLancamentos();

  // 1. Seletor de período em pills ("6 meses" é o padrão)
  const [periodo, setPeriodo] = useState<PeriodoTipo>('6_meses');
  const shouldAnimate = useChartAnimation(periodo);

  // Mês atual como referência base
  const now = useMemo(() => new Date(), []);

  // Determinar quantidade de meses e intervalo do período atual e anterior
  const { mesesCount, currentInterval, prevInterval, monthsList } = useMemo(() => {
    let count = 6;
    if (periodo === '3_meses') count = 3;
    else if (periodo === '6_meses') count = 6;
    else if (periodo === '12_meses') count = 12;
    else if (periodo === 'ano_atual') {
      count = now.getMonth() + 1; // De Janeiro até o mês atual
    }

    // O período termina no final do mês atual
    const currentEnd = endOfMonth(now);
    // Início: recua (count - 1) meses a partir do mês atual
    const currentStart = startOfMonth(subMonths(now, count - 1));

    // Período anterior com o mesmo tamanho (exatamente antes do currentStart)
    const prevEnd = endOfMonth(subMonths(currentStart, 1));
    const prevStart = startOfMonth(subMonths(prevEnd, count - 1));

    // Gerar lista ordenada de meses do período atual (do mais antigo ao mês atual)
    const months: Date[] = [];
    for (let i = count - 1; i >= 0; i--) {
      months.push(startOfMonth(subMonths(now, i)));
    }

    return {
      mesesCount: count,
      currentInterval: { start: currentStart, end: currentEnd },
      prevInterval: { start: prevStart, end: prevEnd },
      monthsList: months
    };
  }, [periodo, now]);

  // Filtrar lançamentos dos períodos atual e anterior
  const currentLancamentos = useMemo(() => {
    return lancamentos.filter((t) => {
      const d = getDataExibicao(t);
      return isValid(d) && isWithinInterval(d, currentInterval);
    });
  }, [lancamentos, currentInterval]);

  const prevLancamentos = useMemo(() => {
    return lancamentos.filter((t) => {
      const d = getDataExibicao(t);
      return isValid(d) && isWithinInterval(d, prevInterval);
    });
  }, [lancamentos, prevInterval]);

  // Cálculos do período atual
  const resumoAtual = useMemo(() => {
    const totalEntradas = currentLancamentos
      .filter((t) => t.movimento === 'Entrada')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    const totalSaidas = currentLancamentos
      .filter((t) => t.movimento === 'Saída')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    const saldo = totalEntradas - totalSaidas;

    // Taxa de economia = (Saldo / Total de Entradas) * 100
    const taxaEconomia = totalEntradas > 0 ? (saldo / totalEntradas) * 100 : 0;

    return {
      totalEntradas,
      totalSaidas,
      saldo,
      taxaEconomia,
      temLancamentos: currentLancamentos.length > 0
    };
  }, [currentLancamentos]);

  // Cálculos do período anterior para comparações
  const resumoAnterior = useMemo(() => {
    if (prevLancamentos.length === 0) return null;

    const totalEntradas = prevLancamentos
      .filter((t) => t.movimento === 'Entrada')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    const totalSaidas = prevLancamentos
      .filter((t) => t.movimento === 'Saída')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    const saldo = totalEntradas - totalSaidas;
    const taxaEconomia = totalEntradas > 0 ? (saldo / totalEntradas) * 100 : 0;

    return {
      totalEntradas,
      totalSaidas,
      saldo,
      taxaEconomia
    };
  }, [prevLancamentos]);

  // Cálculo de percentual de variação
  const calcDiff = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100);
  };

  const diffEntradas = resumoAnterior ? calcDiff(resumoAtual.totalEntradas, resumoAnterior.totalEntradas) : null;
  const diffSaidas = resumoAnterior ? calcDiff(resumoAtual.totalSaidas, resumoAnterior.totalSaidas) : null;
  const diffSaldo = resumoAnterior ? calcDiff(resumoAtual.saldo, resumoAnterior.saldo) : null;
  const diffTaxa = resumoAnterior ? Math.round(resumoAtual.taxaEconomia - resumoAnterior.taxaEconomia) : null;

  // Dados mês a mês para os gráficos principais
  const chartMonthlyData = useMemo(() => {
    let acumulado = 0;

    return monthsList.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const itemsInMonth = currentLancamentos.filter((t) => {
        const d = getDataExibicao(t);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      const entradas = itemsInMonth
        .filter((t) => t.movimento === 'Entrada')
        .reduce((acc, t) => acc + (t.valor || 0), 0);

      const saidas = itemsInMonth
        .filter((t) => t.movimento === 'Saída')
        .reduce((acc, t) => acc + (t.valor || 0), 0);

      const saldoMes = entradas - saidas;
      acumulado += saldoMes;

      const labelRaw = format(monthDate, 'MMM', { locale: ptBR });
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
      const isCurrentMonth = monthDate.getMonth() === now.getMonth() && monthDate.getFullYear() === now.getFullYear();

      return {
        label,
        fullLabel: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR }),
        entradas,
        saidas,
        saldoMes,
        saldoAcumulado: acumulado,
        isCurrentMonth
      };
    });
  }, [monthsList, currentLancamentos, now]);

  // ==========================================
  // 1. COMPARATIVO POR RESPONSÁVEL (Ahyslla x Marcos)
  // ==========================================
  const responsaveisComparativo = useMemo(() => {
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

    const getStats = (nameQuery: string, fullName: string) => {
      const q = normalize(nameQuery);
      const items = currentLancamentos.filter(t => normalize(t.responsavel).includes(q));
      const recebido = items.filter(t => t.movimento === 'Entrada').reduce((acc, t) => acc + (t.valor || 0), 0);
      const gastou = items.filter(t => t.movimento === 'Saída').reduce((acc, t) => acc + (t.valor || 0), 0);
      return {
        name: fullName,
        shortName: nameQuery,
        recebido,
        gastou,
        saldo: recebido - gastou,
        fotoUrl: FOTOS_RESPONSAVEIS[fullName]
      };
    };

    const ahyslla = getStats('Ahyslla', 'Ahyslla Vascaina');
    const marcos = getStats('Marcos', 'Marcos Andrade');
    const totalGastosJuntos = ahyslla.gastou + marcos.gastou;

    const ahysllaPct = totalGastosJuntos > 0 ? (ahyslla.gastou / totalGastosJuntos) * 100 : 50;
    const marcosPct = totalGastosJuntos > 0 ? (marcos.gastou / totalGastosJuntos) * 100 : 50;

    const temDados = (ahyslla.recebido > 0 || ahyslla.gastou > 0 || marcos.recebido > 0 || marcos.gastou > 0);

    return { ahyslla, marcos, totalGastosJuntos, ahysllaPct, marcosPct, temDados };
  }, [currentLancamentos]);

  // ==========================================
  // 2. EVOLUÇÃO POR CATEGORIA
  // ==========================================
  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    currentLancamentos.forEach(t => {
      if (t.movimento === 'Saída' && t.categoria) {
        set.add(t.categoria.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [currentLancamentos]);

  const [selectedCategoria, setSelectedCategoria] = useState<string>('');

  // Sincronizar categoria inicial caso disponível
  const activeCategoria = useMemo(() => {
    if (selectedCategoria && categoriasDisponiveis.includes(selectedCategoria)) {
      return selectedCategoria;
    }
    return categoriasDisponiveis[0] || '';
  }, [selectedCategoria, categoriasDisponiveis]);

  const evolucaoCategoriaData = useMemo(() => {
    if (!activeCategoria) return { chartData: [], media: 0, total: 0 };

    let total = 0;
    const chartData = monthsList.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const itemsInMonth = currentLancamentos.filter((t) => {
        const d = getDataExibicao(t);
        return (
          t.movimento === 'Saída' &&
          (t.categoria || '').trim().toLowerCase() === activeCategoria.trim().toLowerCase() &&
          isWithinInterval(d, { start: monthStart, end: monthEnd })
        );
      });

      const gasto = itemsInMonth.reduce((acc, t) => acc + (t.valor || 0), 0);
      total += gasto;

      const labelRaw = format(monthDate, 'MMM', { locale: ptBR });
      return {
        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
        fullLabel: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR }),
        gasto
      };
    });

    const media = monthsList.length > 0 ? total / monthsList.length : 0;
    return { chartData, media, total };
  }, [activeCategoria, monthsList, currentLancamentos]);

  // ==========================================
  // 3. CARTÕES DE CRÉDITO DINÂMICOS
  // ==========================================
  const cartoesList = useMemo(() => {
    const list = [...CARTOES];
    lancamentos.forEach((t) => {
      if (t.banco && isCartao(t.banco)) {
        const matched = matchCartao(t.banco, list);
        if (matched && !list.includes(matched)) {
          list.push(matched);
        } else if (!matched) {
          const nomeFormatado = t.banco.trim();
          if (!list.includes(nomeFormatado)) list.push(nomeFormatado);
        }
      }
    });
    return list;
  }, [lancamentos]);

  const cartoesData = useMemo(() => {
    // Totais acumulados por cartão no período selecionado
    const totaisPorCartao: Record<string, number> = {};
    cartoesList.forEach(c => {
      totaisPorCartao[c] = 0;
    });

    const chartData = monthsList.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const itemsInMonth = currentLancamentos.filter((t) => {
        const d = getDataExibicao(t);
        return t.movimento === 'Saída' && isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      const row: Record<string, any> = {
        label: format(monthDate, 'MMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
        fullLabel: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR })
      };

      cartoesList.forEach((cartao, idx) => {
        const totalMes = itemsInMonth
          .filter(t => matchCartao(t.banco || '', cartoesList) === cartao)
          .reduce((acc, t) => acc + (t.valor || 0), 0);

        const dataKey = `c${idx}`;
        row[dataKey] = totalMes;
        totaisPorCartao[cartao] += totalMes;
      });

      return row;
    });

    const cartoesInfo = cartoesList.map((cartao, idx) => {
      const visual = getCartaoVisual(cartao);
      return {
        key: cartao,
        dataKey: `c${idx}`,
        name: cartao,
        shortName: visual.shortName,
        color: visual.color,
        totalPeriodo: totaisPorCartao[cartao] || 0
      };
    });

    return {
      chartData,
      cartoesInfo
    };
  }, [monthsList, currentLancamentos, cartoesList]);

  const cartoesYAxisInfo = useMemo(() => {
    const isStacked = mesesCount > 6;
    let maxVal = 0;

    if (isStacked) {
      cartoesData.chartData.forEach(row => {
        let sum = 0;
        cartoesData.cartoesInfo.forEach(c => sum += (row[c.dataKey] || 0));
        if (sum > maxVal) maxVal = sum;
      });
    } else {
      cartoesData.chartData.forEach(row => {
        cartoesData.cartoesInfo.forEach(c => {
          if ((row[c.dataKey] || 0) > maxVal) maxVal = row[c.dataKey];
        });
      });
    }

    const max = Math.ceil(maxVal * 1.1 / 50) * 50 || 100;
    return { max, ticks: [0, max / 2, max] };
  }, [cartoesData, mesesCount]);

  const totalCartoesPeriodo = useMemo(() => 
    cartoesData.cartoesInfo.reduce((acc, c) => acc + c.totalPeriodo, 0), 
    [cartoesData]);

  // Formatação dos ticks do eixo Y sem repetição
  const formatCartoesYAxis = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000) {
      const kVal = val / 1000;
      return Number.isInteger(kVal) ? `${kVal}k` : `${kVal.toFixed(1)}k`;
    }
    return `${val}`;
  };


  // ==========================================
  // 4. DESTAQUES (Melhor mês, Pior mês, Médias)
  // ==========================================
  const destaques = useMemo(() => {
    if (chartMonthlyData.length === 0) return null;

    // Melhor mês = maior sobra (maior saldoMes)
    const sortedBySobra = [...chartMonthlyData].sort((a, b) => b.saldoMes - a.saldoMes);
    const melhorMes = sortedBySobra[0];

    // Pior mês = maior gasto (maior saidas)
    const sortedByGasto = [...chartMonthlyData].sort((a, b) => b.saidas - a.saidas);
    const piorMes = sortedByGasto[0];

    const mediaEntradas = resumoAtual.totalEntradas / Math.max(chartMonthlyData.length, 1);
    const mediaSaidas = resumoAtual.totalSaidas / Math.max(chartMonthlyData.length, 1);

    return {
      melhorMes,
      piorMes,
      mediaEntradas,
      mediaSaidas
    };
  }, [chartMonthlyData, resumoAtual]);

  // ==========================================
  // 5. MAIORES GASTOS (Top 5 saídas do período)
  // ==========================================
  const maioresGastos = useMemo(() => {
    return currentLancamentos
      .filter(t => t.movimento === 'Saída' && (t.valor || 0) > 0)
      .sort((a, b) => (b.valor || 0) - (a.valor || 0))
      .slice(0, 5);
  }, [currentLancamentos]);

  // ==========================================
  // 6. PROJEÇÃO DO MÊS ATUAL
  // ==========================================
  const projecaoMes = useMemo(() => {
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const itemsCurrentMonth = lancamentos.filter(t => {
      const d = getDataExibicao(t);
      return t.movimento === 'Saída' && isWithinInterval(d, { start: currentMonthStart, end: currentMonthEnd });
    });

    // Dias com lançamentos distintos no mês atual
    const distinctDays = new Set(itemsCurrentMonth.map(t => getDate(getDataExibicao(t))));
    if (distinctDays.size < 5) return null; // Regra: mínimo de 5 dias

    const totalSaidasAteHoje = itemsCurrentMonth.reduce((acc, t) => acc + (t.valor || 0), 0);
    const diaAtual = Math.max(getDate(now), 1);
    const totalDiasNoMes = getDaysInMonth(now);

    // Ritmo diário e projeção
    const ritmoDiario = totalSaidasAteHoje / diaAtual;
    const projecaoTotal = ritmoDiario * totalDiasNoMes;

    // Média de saídas dos meses anteriores fechados
    const mesesAnteriores = chartMonthlyData.filter(m => !m.isCurrentMonth);
    const mediaMesesAnteriores = mesesAnteriores.length > 0
      ? mesesAnteriores.reduce((acc, m) => acc + m.saidas, 0) / mesesAnteriores.length
      : 0;

    const diffProjecao = mediaMesesAnteriores > 0
      ? Math.round(((projecaoTotal - mediaMesesAnteriores) / mediaMesesAnteriores) * 100)
      : null;

    return {
      totalSaidasAteHoje,
      projecaoTotal,
      mediaMesesAnteriores,
      diffProjecao,
      diaAtual,
      totalDiasNoMes
    };
  }, [lancamentos, now, chartMonthlyData]);

  // ==========================================
  // 7. PARCELAS FUTURAS E GRÁFICO (Próximos 12 meses)
  // ==========================================
  const { parcelasFuturasData, listaParcelasFuturas } = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(now, -i)));
    
    const data = months.map(mDate => {
      const mEnd = endOfMonth(mDate);
      const itemsInMonth = lancamentos.filter(t => 
        t.movimento === 'Saída' && 
        isCartao(t.banco) && 
        isWithinInterval(t.data_hora, { start: mDate, end: mEnd })
      );

      const row: Record<string, any> = {
        label: format(mDate, 'MMM/yy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
        fullLabel: format(mDate, "MMMM 'de' yyyy", { locale: ptBR }),
        isCurrentMonth: mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear(),
        total: 0
      };

      cartoesList.forEach((cartao, idx) => {
        const totalMes = itemsInMonth
          .filter(t => matchCartao(t.banco || '', cartoesList) === cartao)
          .reduce((acc, t) => acc + (t.valor || 0), 0);
        row[`c${idx}`] = totalMes;
        row.total += totalMes;
      });

      return row;
    });

    const lista = months.map(mDate => {
      const mEnd = endOfMonth(mDate);
      const itemsInMonth = lancamentos.filter(t => 
        t.movimento === 'Saída' && 
        isCartao(t.banco) && 
        isWithinInterval(t.data_hora, { start: mDate, end: mEnd })
      );
      return {
        month: mDate,
        label: format(mDate, 'MMM/yy', { locale: ptBR }).charAt(0).toUpperCase() + format(mDate, 'MMM/yy', { locale: ptBR }).slice(1),
        total: itemsInMonth.reduce((acc, t) => acc + (t.valor || 0), 0),
        count: itemsInMonth.length
      };
    });

    return { parcelasFuturasData: data, listaParcelasFuturas: lista };
  }, [lancamentos, now, cartoesList]);

  const totalComprometido = useMemo(() => parcelasFuturasData.reduce((acc, row) => acc + row.total, 0), [parcelasFuturasData]);
  const maiorFatura = useMemo(() => [...parcelasFuturasData].sort((a, b) => b.total - a.total)[0], [parcelasFuturasData]);

  // ==========================================
  // 8. INSIGHTS EM TEXTO (Até 3 frases relevantes)
  // ==========================================
  const insights = useMemo(() => {
    const list: string[] = [];

    // Insight 1: Comparativo com o período anterior
    if (diffSaidas !== null && Math.abs(diffSaidas) >= 5) {
      if (diffSaidas > 0) {
        list.push(`Seus gastos totais subiram ${Math.abs(diffSaidas)}% em relação ao período anterior.`);
      } else {
        list.push(`Você economizou ${Math.abs(diffSaidas)}% a mais em saídas comparado ao período anterior.`);
      }
    }

    // Insight 2: Taxa de economia
    if (resumoAtual.totalEntradas > 0) {
      if (resumoAtual.taxaEconomia >= 20) {
        list.push(`Ótimo desempenho: sua taxa de economia média no período foi de ${resumoAtual.taxaEconomia.toFixed(0)}% da renda.`);
      } else if (resumoAtual.taxaEconomia < 5 && resumoAtual.taxaEconomia >= 0) {
        list.push(`Atenção ao orçamento: sua taxa de economia ficou em apenas ${resumoAtual.taxaEconomia.toFixed(1)}% no período.`);
      } else if (resumoAtual.saldo < 0) {
        list.push(`Alerta de déficit: as saídas superaram os ganhos em ${formatCurrency(Math.abs(resumoAtual.saldo))} no período.`);
      }
    }

    // Insight 3: Destaque de gastos
    if (maioresGastos.length > 0) {
      const topGasto = maioresGastos[0];
      const percentualDoTotal = resumoAtual.totalSaidas > 0
        ? Math.round((topGasto.valor / resumoAtual.totalSaidas) * 100)
        : 0;

      if (percentualDoTotal >= 15) {
        list.push(`O maior gasto individual foi "${topGasto.descricao || topGasto.categoria}", representando ${percentualDoTotal}% das saídas.`);
      }
    }

    // Insight 4: Projeção
    if (list.length < 3 && projecaoMes && projecaoMes.diffProjecao !== null && Math.abs(projecaoMes.diffProjecao) >= 10) {
      if (projecaoMes.diffProjecao > 0) {
        list.push(`No ritmo atual, o mês fechará cerca de ${projecaoMes.diffProjecao}% acima da sua média de gastos.`);
      } else {
        list.push(`No ritmo atual, o mês fechará cerca de ${Math.abs(projecaoMes.diffProjecao)}% abaixo da média de gastos.`);
      }
    }

    return list.slice(0, 3);
  }, [diffSaidas, resumoAtual, maioresGastos, projecaoMes]);

  return (
    <div className="flex flex-col w-full min-h-full text-[var(--text-primary)]" style={{ paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom))' }}>
      {/* 1. Seletor de período em pills */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-2 w-full bg-[var(--bg-app)] border-b border-[var(--border)] shadow-sm fade-up" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="w-full bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-full flex items-center shadow-sm">
          {PERIODOS.map((p) => {
            const isSelected = periodo === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={`flex-1 min-h-[44px] px-1 rounded-full text-xs font-semibold transition-all flex items-center justify-center cursor-pointer whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Loading / Erro */}
        {loading && (
          <div className="p-4 text-center text-xs text-[var(--text-secondary)] animate-pulse">
            Carregando movimentações da planilha...
          </div>
        )}
        {erro && (
          <div className="p-3 text-center text-xs bg-red-500/10 border border-red-500/20 text-[var(--danger)] rounded-xl flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <span>{erro}</span>
          </div>
        )}

        {/* Estado vazio geral caso não haja lançamentos no período */}
        {!loading && !resumoAtual.temLancamentos ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-[var(--shadow)]">
            <div className="w-16 h-16 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
              <Wallet size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Sem lançamentos neste período
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                Nenhuma entrada ou saída encontrada para os {PERIODOS.find(p => p.id === periodo)?.label.toLowerCase()}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/novo')}
              className="min-h-[44px] px-6 py-2.5 bg-[var(--primary)] text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={16} />
              <span>Adicionar lançamento</span>
            </button>
          </div>
        ) : (
          <>
            {/* 8. INSIGHTS EM TEXTO */}
            {insights.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-2.5 fade-up" style={{ '--i': Math.min(2, 8) } as React.CSSProperties}>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                  <Sparkles size={16} />
                  <span>Insights do Período</span>
                </div>
                <div className="space-y-1.5">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text-primary)] leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Cards de resumo do período (2x2) */}
            <div className="grid grid-cols-2 gap-3 fade-up" style={{ '--i': Math.min(3, 8) } as React.CSSProperties}>
              {/* Total de Entradas */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-[var(--shadow)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Entradas</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-[var(--primary)]">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-[var(--primary)] truncate">
                  +{formatCurrency(resumoAtual.totalEntradas)}
                </div>
                {diffEntradas !== null ? (
                  <div className="flex items-center gap-1 text-[11px] mt-1 font-bold">
                    <span className={diffEntradas >= 0 ? 'text-[var(--primary)] flex items-center' : 'text-[var(--danger)] flex items-center'}>
                      {diffEntradas >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                      {diffEntradas > 0 ? `+${diffEntradas}%` : `${diffEntradas}%`}
                    </span>
                    <span className="text-[10px] font-normal text-[var(--text-secondary)]">vs. anterior</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>

              {/* Total de Saídas */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-[var(--shadow)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Saídas</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-[var(--danger)]">
                    <ArrowDownRight size={16} />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-[var(--danger)] truncate">
                  -{formatCurrency(resumoAtual.totalSaidas)}
                </div>
                {diffSaidas !== null ? (
                  <div className="flex items-center gap-1 text-[11px] mt-1 font-bold">
                    <span className={diffSaidas > 0 ? 'text-[var(--danger)] flex items-center' : 'text-[var(--primary)] flex items-center'}>
                      {diffSaidas > 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                      {diffSaidas > 0 ? `+${diffSaidas}%` : `${diffSaidas}%`}
                    </span>
                    <span className="text-[10px] font-normal text-[var(--text-secondary)]">vs. anterior</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>

              {/* Saldo do Período */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-[var(--shadow)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Saldo do período</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500">
                    <Wallet size={16} />
                  </div>
                </div>
                <div className={`text-base sm:text-lg font-black truncate ${resumoAtual.saldo >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                  {resumoAtual.saldo >= 0 ? '+' : ''}{formatCurrency(resumoAtual.saldo)}
                </div>
                {diffSaldo !== null ? (
                  <div className="flex items-center gap-1 text-[11px] mt-1 font-bold">
                    <span className={diffSaldo >= 0 ? 'text-[var(--primary)] flex items-center' : 'text-[var(--danger)] flex items-center'}>
                      {diffSaldo >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                      {diffSaldo > 0 ? `+${diffSaldo}%` : `${diffSaldo}%`}
                    </span>
                    <span className="text-[10px] font-normal text-[var(--text-secondary)]">vs. anterior</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>

              {/* Taxa de Economia */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-[var(--shadow)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Taxa de economia</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <Percent size={15} />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-[var(--text-primary)] truncate">
                  {resumoAtual.taxaEconomia.toFixed(1)}%
                </div>
                {diffTaxa !== null ? (
                  <div className="flex items-center gap-1 text-[11px] mt-1 font-bold">
                    <span className={diffTaxa >= 0 ? 'text-[var(--primary)] flex items-center' : 'text-[var(--danger)] flex items-center'}>
                      {diffTaxa >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                      {diffTaxa > 0 ? `+${diffTaxa} pp` : `${diffTaxa} pp`}
                    </span>
                    <span className="text-[10px] font-normal text-[var(--text-secondary)]">vs. anterior</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            </div>

            {/* 3. Gráfico de Barras "Entradas x Saídas" */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3 fade-up" style={{ '--i': Math.min(4, 8) } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Entradas x Saídas</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Comparativo mensal por período</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                    <span className="text-[var(--text-secondary)]">Entradas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                    <span className="text-[var(--text-secondary)]">Saídas</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      tickFormatter={(val) => {
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                    />
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [
                        formatCurrency(Number(val) || 0), 
                        name === 'entradas' ? 'Entradas' : 'Saídas'
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={shouldAnimate} animationDuration={450} animationEasing="ease-out" animationBegin={0} />
                    <Bar dataKey="saidas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={shouldAnimate} animationDuration={450} animationEasing="ease-out" animationBegin={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Gráfico de Linha "Evolução do Saldo" */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3 fade-up" style={{ '--i': Math.min(5, 8) } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Evolução do Saldo</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Acumulado do período mês a mês</p>
                </div>
                <div className="text-xs font-bold text-[var(--primary)]">
                  {formatCurrency(resumoAtual.saldo)}
                </div>
              </div>

              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartMonthlyData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      tickFormatter={(val) => {
                        if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Saldo Acumulado']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="saldoAcumulado" 
                      fill="url(#saldoGradient)" 
                      stroke="none" 
                      isAnimationActive={shouldAnimate}
                      animationDuration={450}
                      animationEasing="ease-out"
                      animationBegin={0}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldoAcumulado" 
                      stroke="#10B981" 
                      strokeWidth={2.5}
                      isAnimationActive={shouldAnimate}
                      animationDuration={450}
                      animationEasing="ease-out"
                      animationBegin={0}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isCurrentMonth) {
                          return (
                            <circle 
                              key={`dot-${payload.label}`} 
                              cx={cx} 
                              cy={cy} 
                              r={5} 
                              fill="#10B981" 
                              stroke="#FFFFFF" 
                              strokeWidth={2} 
                            />
                          );
                        }
                        return (
                          <circle 
                            key={`dot-${payload.label}`} 
                            cx={cx} 
                            cy={cy} 
                            r={3} 
                            fill="#10B981" 
                          />
                        );
                      }}
                      activeDot={{ r: 6, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ETAPA 2: NOVOS BLOCOS REQUISITADOS                       */}
            {/* ======================================================== */}

            {/* 1. COMPARATIVO POR RESPONSÁVEL: Ahyslla x Marcos */}
            {responsaveisComparativo.temDados && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Comparativo por Responsável</h3>
                  <span className="text-[11px] text-[var(--text-secondary)]">Divisão do período</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Ahyslla */}
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center text-center space-y-2">
                    <ResponsavelAvatar 
                      name={responsaveisComparativo.ahyslla.name} 
                      fotoUrl={responsaveisComparativo.ahyslla.fotoUrl} 
                      size={48} 
                    />
                    <div className="w-full">
                      <span className="font-bold text-xs text-[var(--text-primary)] block truncate">
                        {responsaveisComparativo.ahyslla.shortName}
                      </span>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Recebeu:</span>
                          <span className="font-bold text-[var(--primary)]">+{formatCurrency(responsaveisComparativo.ahyslla.recebido)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastou:</span>
                          <span className="font-bold text-[var(--danger)]">-{formatCurrency(responsaveisComparativo.ahyslla.gastou)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[var(--border)] font-bold">
                          <span>Saldo:</span>
                          <span className={responsaveisComparativo.ahyslla.saldo >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}>
                            {formatCurrency(responsaveisComparativo.ahyslla.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marcos */}
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center text-center space-y-2">
                    <ResponsavelAvatar 
                      name={responsaveisComparativo.marcos.name} 
                      fotoUrl={responsaveisComparativo.marcos.fotoUrl} 
                      size={48} 
                    />
                    <div className="w-full">
                      <span className="font-bold text-xs text-[var(--text-primary)] block truncate">
                        {responsaveisComparativo.marcos.shortName}
                      </span>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Recebeu:</span>
                          <span className="font-bold text-[var(--primary)]">+{formatCurrency(responsaveisComparativo.marcos.recebido)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastou:</span>
                          <span className="font-bold text-[var(--danger)]">-{formatCurrency(responsaveisComparativo.marcos.gastou)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[var(--border)] font-bold">
                          <span>Saldo:</span>
                          <span className={responsaveisComparativo.marcos.saldo >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}>
                            {formatCurrency(responsaveisComparativo.marcos.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de Proporção de Gastos */}
                {responsaveisComparativo.totalGastosJuntos > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                      <span>Ahyslla: {responsaveisComparativo.ahysllaPct.toFixed(0)}% dos gastos</span>
                      <span>Marcos: {responsaveisComparativo.marcosPct.toFixed(0)}% dos gastos</span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--border)] rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500 transition-transform duration-500 ease-out" 
                        style={{ transform: `scaleX(${Math.min(1, responsaveisComparativo.ahysllaPct / 100)})`, transformOrigin: 'left' }}
                        title={`Ahyslla: ${responsaveisComparativo.ahysllaPct.toFixed(1)}%`}
                      />
                      <div 
                        className="h-full bg-blue-500 transition-transform duration-500 ease-out" 
                        style={{ transform: `scaleX(${Math.min(1, responsaveisComparativo.marcosPct / 100)})`, transformOrigin: 'left' }}
                        title={`Marcos: ${responsaveisComparativo.marcosPct.toFixed(1)}%`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. EVOLUÇÃO POR CATEGORIA */}
            {categoriasDisponiveis.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Evolução por Categoria</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Média: {formatCurrency(evolucaoCategoriaData.media)}/mês
                    </p>
                  </div>

                  {/* Dropdown de Categorias com toque acessível de 44px */}
                  <div className="relative min-w-[150px]">
                    <select
                      value={activeCategoria}
                      onChange={(e) => setSelectedCategoria(e.target.value)}
                      className="w-full min-h-[44px] px-3 pr-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--primary)]"
                    >
                      {categoriasDisponiveis.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]" />
                  </div>
                </div>

                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolucaoCategoriaData.chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                        tickFormatter={(val) => {
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                          return `${val}`;
                        }}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0), activeCategoria]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="gasto" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. CARTÕES DE CRÉDITO: Lista completa e dinâmica */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Cartões de Crédito</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Gasto mensal por bandeira</p>
                </div>

                {/* Legenda com quebra de linha elegante */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                  {cartoesData.cartoesInfo.map((card) => (
                    <div key={card.key} className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: card.color }} />
                      <span className="text-[var(--text-secondary)] font-medium">{card.shortName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {totalCartoesPeriodo === 0 ? (
                <p className="text-center text-xs text-[var(--text-secondary)] py-8">Sem gastos no cartão neste período</p>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%" key={periodo}>
                    <BarChart data={cartoesData.chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        interval={0}
                        tick={{ fill: 'var(--text-secondary)', fontSize: mesesCount > 6 ? 9 : 10 }} 
                      />
                      <YAxis 
                        width={36}
                        domain={[0, cartoesYAxisInfo.max]}
                        ticks={cartoesYAxisInfo.ticks}
                        axisLine={false} 
                        tickLine={false} 
                        allowDecimals={false}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                        tickFormatter={formatCartoesYAxis}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => {
                          const card = cartoesData.cartoesInfo.find(c => c.dataKey === name);
                          const label = card ? card.shortName : name;
                          return [formatCurrency(Number(val) || 0), label];
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                      {cartoesData.cartoesInfo.map((card) => (
                        <Bar 
                          key={card.key} 
                          dataKey={card.dataKey} 
                          fill={card.color} 
                          radius={[3, 3, 0, 0]} 
                          maxBarSize={22}
                          stackId={mesesCount > 6 ? "cartoes" : undefined}
                          isAnimationActive={false}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}


              {/* Rodapé com uma linha por cartão em 2 colunas */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-[var(--border)]">
                {cartoesData.cartoesInfo.map((card) => (
                  <div key={card.key} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] truncate mr-1">
                      Total {card.shortName}:
                    </span>
                    <span className="font-bold shrink-0" style={{ color: card.color }}>
                      {formatCurrency(card.totalPeriodo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. DESTAQUES: Melhor mês, Pior mês e Médias mensais */}
            {destaques && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Destaques do Período</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Melhor mês */}
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                      Maior Sobra
                    </span>
                    <div className="text-sm font-bold text-[var(--primary)]">
                      {destaques.melhorMes.label}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] font-semibold">
                      +{formatCurrency(destaques.melhorMes.saldoMes)}
                    </div>
                  </div>

                  {/* Pior mês */}
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                      Maior Gasto
                    </span>
                    <div className="text-sm font-bold text-[var(--danger)]">
                      {destaques.piorMes.label}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] font-semibold">
                      -{formatCurrency(destaques.piorMes.saidas)}
                    </div>
                  </div>
                </div>

                {/* Médias mensais */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)] block">Média de Entradas:</span>
                    <span className="font-bold text-[var(--primary)]">+{formatCurrency(destaques.mediaEntradas)}/mês</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] block">Média de Saídas:</span>
                    <span className="font-bold text-[var(--danger)]">-{formatCurrency(destaques.mediaSaidas)}/mês</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PROJEÇÃO DO MÊS ATUAL (com base em ritmo) */}
            {projecaoMes && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[var(--primary)]" />
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Projeção para o Fim do Mês</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                    Dia {projecaoMes.diaAtual} de {projecaoMes.totalDiasNoMes}
                  </span>
                </div>

                <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-[var(--text-secondary)]">Gasto estimado até dia {projecaoMes.totalDiasNoMes}:</span>
                    <span className="text-base font-black text-[var(--text-primary)]">
                      {formatCurrency(projecaoMes.projecaoTotal)}
                    </span>
                  </div>

                  <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[var(--primary)] h-full rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((projecaoMes.totalSaidasAteHoje / projecaoMes.projecaoTotal) * 100, 100)}%` }} 
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[var(--text-secondary)]">
                    <span>Gasto real até hoje: {formatCurrency(projecaoMes.totalSaidasAteHoje)}</span>
                    {projecaoMes.diffProjecao !== null && (
                      <span className={projecaoMes.diffProjecao > 0 ? 'text-[var(--danger)] font-bold' : 'text-[var(--primary)] font-bold'}>
                        {projecaoMes.diffProjecao > 0 ? `+${projecaoMes.diffProjecao}% vs média` : `${projecaoMes.diffProjecao}% vs média`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. PARCELAS POR PERÍODO */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-4 fade-up" style={{ '--i': Math.min(6, 8) } as React.CSSProperties}>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Parcelas por período</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">Soma das faturas de todos os cartões</p>
              </div>

              {totalComprometido === 0 ? (
                <p className="text-center text-xs text-[var(--text-secondary)] py-8">Nenhuma parcela comprometida nos próximos meses</p>
              ) : (
                <>
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={parcelasFuturasData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={val => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`} />
                        <RechartsTooltip 
                          formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Valor']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                          contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {cartoesList.map((cartao, idx) => {
                          const visual = getCartaoVisual(cartao);
                          return (
                            <Bar key={cartao} dataKey={`c${idx}`} name={visual.shortName} stackId="cartoes" fill={visual.color} isAnimationActive={shouldAnimate} animationDuration={450} animationBegin={0}>
                              {parcelasFuturasData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fillOpacity={entry.isCurrentMonth ? 1 : 0.8} stroke={entry.isCurrentMonth ? '#fff' : 'none'} />
                              ))}
                            </Bar>
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
                    <div className="flex justify-between">
                      <span>Total comprometido:</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatCurrency(totalComprometido)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maior fatura:</span>
                      <span className="font-bold text-[var(--danger)]">{maiorFatura?.label} · {formatCurrency(maiorFatura?.total || 0)}</span>
                    </div>
                  </div>

                  {/* Lista de meses */}
                  <div className="space-y-1.5 pt-2">
                    {listaParcelasFuturas.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-secondary)]">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-secondary)]">{item.count} {item.count === 1 ? 'lançamento' : 'lançamentos'}</span>
                          <span className="font-bold">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 5. MAIORES GASTOS DO PERÍODO */}
            {maioresGastos.length > 0 && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Maiores Gastos do Período</h3>
                  <span className="text-[11px] text-[var(--text-secondary)]">Top 5 saídas</span>
                </div>

                <div className="space-y-2">
                  {maioresGastos.map((gasto, index) => {
                    const dataFormatada = !isNaN(new Date(gasto.data_hora).getTime())
                      ? format(new Date(gasto.data_hora), 'dd/MM/yyyy', { locale: ptBR })
                      : '';

                    return (
                      <div 
                        key={gasto.id || index}
                        className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                              {gasto.descricao || gasto.categoria || 'Saída sem descrição'}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                              <span>{gasto.categoria}</span>
                              {gasto.responsavel && <span>• {gasto.responsavel}</span>}
                              {dataFormatada && <span>• {dataFormatada}</span>}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-[var(--danger)] shrink-0">
                          -{formatCurrency(gasto.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
