import { useState } from 'react';
import { Bell, Calendar, Eye, EyeOff, ChevronRight, ArrowUpCircle, ArrowDownCircle, ShoppingBag, Wifi, Coffee, Heart, BookOpen, Shirt, Tv, Zap, Droplet, Fuel, DollarSign, Briefcase, BellRing, BellOff } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useLancamentos } from '../hooks/useLancamentos';
import { useNotification } from '../hooks/useNotification';
import { format, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/common/ThemeToggle';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { useMonth, MonthChips } from '../components/common/MonthContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CARTOES, isCartao, CARTAO_ESTILOS, CARTAO_ESTILO_PADRAO, FOTOS_RESPONSAVEIS } from '../lib/constants';
import ResponsavelAvatar from '../components/common/ResponsavelAvatar';

const getCategoryInfo = (categoria: string) => {
  const map: Record<string, { icon: any, color: string }> = {
    'Alimentação': { icon: Coffee, color: 'bg-orange-500' },
    'Mercado Livre': { icon: ShoppingBag, color: 'bg-yellow-500' },
    'Internet': { icon: Wifi, color: 'bg-blue-500' },
    'Energia': { icon: Zap, color: 'bg-yellow-400' },
    'Saúde': { icon: Heart, color: 'bg-red-500' },
    'Estudos': { icon: BookOpen, color: 'bg-purple-500' },
    'Vestuário': { icon: Shirt, color: 'bg-pink-500' },
    'Assinaturas digitais': { icon: Tv, color: 'bg-indigo-500' },
    'Combustivel': { icon: Fuel, color: 'bg-gray-600' },
    'Àgua': { icon: Droplet, color: 'bg-blue-400' },
    'Salário': { icon: DollarSign, color: 'bg-green-600' },
  };
  return map[categoria] || { icon: Briefcase, color: 'bg-gray-400' };
};

export default function Home() {
  const { lancamentos, loading, erro, lastUpdated } = useLancamentos();
  const { enabled, toggleNotifications } = useNotification();
  const { currentDate, setCurrentDate } = useMonth();
  const [showValues, setShowValues] = useState(true);
  const navigate = useNavigate();

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 50) setCurrentDate(subMonths(currentDate, 1));
    else if (info.offset.x < -50) setCurrentDate(addMonths(currentDate, 1));
  };

  const getFilteredData = (date: Date) => lancamentos.filter(t => isSameMonth(t.data_hora, date));
  const filteredData = getFilteredData(currentDate);
  const prevMonthData = getFilteredData(subMonths(currentDate, 1));

  const totalEntrada = filteredData.filter(t => t.movimento === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
  const totalSaida = filteredData.filter(t => t.movimento === 'Saída').reduce((sum, t) => sum + t.valor, 0);
  const saldo = totalEntrada - totalSaida;
  
  const prevEntrada = prevMonthData.filter(t => t.movimento === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
  const prevSaida = prevMonthData.filter(t => t.movimento === 'Saída').reduce((sum, t) => sum + t.valor, 0);

  const getComparison = (current: number, prev: number, isEntrada: boolean) => {
      if (prev === 0) return "—";
      const diff = ((current - prev) / prev) * 100;
      const isIncrease = diff > 0;
      const color = (isEntrada ? isIncrease : !isIncrease) ? "text-[var(--primary)]" : "text-[var(--danger)]";
      return <span className={`text-[10px] ${color}`}>▲ {Math.abs(diff).toFixed(0)}% vs mês anterior</span>;
  }

  const latest = [...filteredData].sort((a,b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()).slice(0, 6);

  const saídas = filteredData.filter(t => t.movimento === 'Saída');
  const catMap = saídas.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
  }, {} as Record<string, number>);
  
  const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
  const top5 = sortedCats.slice(0, 5);
  const outros = sortedCats.slice(5).reduce((sum, [,val]) => sum + val, 0);
  
  const chartData = [
      ...top5.map(([name, value]) => ({ name, value })),
      ...(outros > 0 ? [{ name: 'Outros', value: outros }] : [])
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  const cardSpends = CARTOES.map(cartao => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const c = norm(cartao);
    const cBrand = c.replace('cartao', '').trim();
    const total = filteredData
      .filter(t => {
        if (t.movimento !== 'Saída') return false;
        const b = norm(t.banco || '');
        return b === c || (isCartao(t.banco || '') && (b.includes(cBrand) || c.includes(b)));
      })
      .reduce((sum, t) => sum + t.valor, 0);
    return { name: cartao, value: total };
  }).sort((a, b) => b.value - a.value);

  const totalCartoes = cardSpends.reduce((sum, c) => sum + c.value, 0);
  const maxCardSpend = Math.max(...cardSpends.map(c => c.value), 1);
  const hasCardSpend = totalCartoes > 0;

  const defaultResponsaveis = ['Ahyslla Vascaina', 'Marcos Andrade'];
  const allResponsaveis = Array.from(new Set([...defaultResponsaveis, ...lancamentos.map(t => t.responsavel).filter(Boolean)]));
  
  const responsavelStats = allResponsaveis.map(resp => {
    const respData = filteredData.filter(t => t.responsavel === resp);
    const recebeu = respData.filter(t => t.movimento === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
    const gastou = respData.filter(t => t.movimento === 'Saída').reduce((sum, t) => sum + t.valor, 0);
    const saldoResp = recebeu - gastou;
    return { name: resp, recebeu, gastou, saldo: saldoResp };
  });

  const maxRespVal = Math.max(...responsavelStats.flatMap(r => [r.recebeu, r.gastou]), 1);

  if (loading) return <div className="p-4 space-y-4 animate-pulse"><div className="h-40 bg-[var(--bg-card)] rounded-2xl"/></div>;
  if (erro) return <div className="p-4 text-center text-[var(--danger)]">{erro}</div>;

  return (
    <div className="flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] pb-32 w-full">
        {/* Header de borda a borda */}
        <header className="w-full bg-gradient-to-b from-[#0B8F4D] to-[#12B76A] dark:from-[#086a3b] dark:to-[#0e8a50] text-white p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16 rounded-b-[28px]">
            <div className="flex justify-between items-center mb-6 relative">
              <div className="flex items-center gap-2">
                <PWAInstallButton compact />
                <button 
                  onClick={() => toggleNotifications(!enabled)}
                  className="p-1.5 cursor-pointer hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Notificações"
                >
                  {enabled ? <BellRing size={22} /> : <BellOff size={22} />}
                </button>
                <Bell size={24} />
                <ThemeToggle />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="p-1.5 cursor-pointer hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Ir para o mês atual"
                  title="Ir para o mês atual"
                >
                  <Calendar size={24} />
                </button>
              </div>
            </div>

            <div className="text-sm opacity-90">Saldo total</div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl font-bold">{showValues ? formatCurrency(saldo) : '••••••••'}</span>
                <button onClick={() => setShowValues(!showValues)} className="cursor-pointer">{showValues ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
            </div>
            <div className="text-xs opacity-80">Atualizado há {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)} minutos</div>

            {/* Seletor de meses em linha própria abaixo do saldo e acima dos cards */}
            <div className="mt-3 mb-4 w-full">
              <MonthChips />
            </div>
        </header>

      <div className="px-4 -mt-10 grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-[var(--shadow)] border border-[var(--border)]">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Entrada</div>
            <div className="text-xl font-bold text-[var(--primary)]">+{showValues ? formatCurrency(totalEntrada) : '••••'}</div>
            {getComparison(totalEntrada, prevEntrada, true)}
        </div>
        <div className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-[var(--shadow)] border border-[var(--border)]">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Saída</div>
            <div className="text-xl font-bold text-[var(--danger)]">-{showValues ? formatCurrency(totalSaida) : '••••'}</div>
            {getComparison(totalSaida, prevSaida, false)}
        </div>
      </div>

      <div className="p-4">
        <h2 className="font-bold text-lg mb-4">Gastos por categoria</h2>
        {totalSaida === 0 ? (
          <p className="text-center text-[var(--text-secondary)] py-8">Sem saídas neste mês</p>
        ) : (
          <div className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-[var(--shadow)] border border-[var(--border)]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0) as any} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {chartData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[var(--text-secondary)]">{entry.name}</span>
                  </div>
                  <span className="font-medium">
                    {showValues ? formatCurrency(entry.value) : '••••'} ({((entry.value / totalSaida) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seção Gasto por cartão de crédito */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Gasto por cartão de crédito</h2>
          <span className="font-bold text-[var(--danger)]">{showValues ? formatCurrency(totalCartoes) : '••••'}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 scroll-snap-x scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {cardSpends.map(c => {
            const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const estilo = CARTAO_ESTILOS[c.name] || CARTAO_ESTILO_PADRAO;
            const isNoGastos = c.value === 0;

            return (
              <div 
                key={c.name}
                onClick={() => navigate('/lancamentos')}
                className={`w-[260px] h-[164px] shrink-0 rounded-2xl p-4 flex flex-col justify-between shadow-[0_8px_20px_rgba(0,0,0,.35)] cursor-pointer hover:opacity-95 transition-all active:scale-[0.98] scroll-snap-align-start relative overflow-hidden ${isNoGastos ? 'opacity-85' : ''}`}
                style={{ background: `linear-gradient(135deg, ${estilo.from}, ${estilo.to})` }}
              >
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full" />

                <div className="flex justify-between items-start text-white relative z-10">
                  <span className="font-bold text-base">{c.name.split(' ')[0]}</span>
                  <span className="text-[10px] font-medium tracking-[1.5px] opacity-85">CRÉDITO</span>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-9 h-7 rounded-md bg-gradient-to-br from-[#E6C16A] to-[#B8923A] flex items-center justify-center p-0.5">
                    <div className="w-full h-full border border-white/30 rounded-[3px]"/>
                  </div>
                  <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm2-12h-4c-1.1 0-2 .9-2 2v8l4-2 4 2V10c0-1.1-.9-2-2-2z"/></svg>
                </div>

                <div className="relative z-10 text-white">
                  <div className="text-[11px] opacity-80">Fatura do mês</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {showValues ? formatCurrency(c.value) : '••••'}
                  </div>
                </div>

                <div className="flex justify-between items-center text-white relative z-10">
                  <span className="text-[11px] opacity-85">Em aberto: {showValues ? formatCurrency(c.value) : '••••'}</span>
                  <div className="w-16 h-1 bg-white/25 rounded-full overflow-hidden">
                    <div className="bg-white/90 h-full rounded-full" style={{ width: `${(c.value / maxCardSpend) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!hasCardSpend && <p className="text-xs text-[var(--text-secondary)] mt-1">Sem gastos no cartão neste mês</p>}
      </div>

      {/* Seção Por responsável */}
      <div className="p-4">
        <h2 className="font-bold text-lg mb-4">Por responsável</h2>
        <div className="space-y-3">
          {responsavelStats.map(r => {
            const initial = r.name ? r.name.charAt(0).toUpperCase() : '?';
            const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const fotoUrl = FOTOS_RESPONSAVEIS[Object.keys(FOTOS_RESPONSAVEIS).find(k => norm(k) === norm(r.name)) || ''] || '';
            
            return (
              <div key={r.name} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
                <div className="flex items-center gap-3 mb-4">
                  <ResponsavelAvatar name={r.name} fotoUrl={fotoUrl} size={56} />
                  <div className="flex flex-col">
                    <div className="font-bold text-[17px] text-[var(--text-primary)] truncate">{r.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Saldo: {showValues ? formatCurrency(r.saldo) : '••••'}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Recebeu</span>
                    <span className="font-bold text-[var(--primary)]">{showValues ? formatCurrency(r.recebeu) : '••••'}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Gastou</span>
                    <span className="font-bold text-[var(--danger)]">{showValues ? formatCurrency(r.gastou) : '••••'}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
                    <span>Saldo</span>
                    <span className={`font-bold ${r.saldo >= 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                      {showValues ? formatCurrency(r.saldo) : '••••'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[var(--primary)] h-full rounded-full" style={{ width: `${(r.recebeu / maxRespVal) * 100}%` }} />
                  </div>
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[var(--danger)] h-full rounded-full" style={{ width: `${(r.gastou / maxRespVal) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Últimos lançamentos</h2>
            <button onClick={() => navigate('/lancamentos')} className="text-sm text-[var(--primary)] flex items-center">Ver todos <ChevronRight size={16}/></button>
        </div>
        
        {latest.length === 0 ? <p className="text-center text-[var(--text-secondary)]">Nenhum lançamento neste mês</p> : (
            <div className="space-y-3">
                {latest.map(t => {
                    const { icon: Icon, color } = getCategoryInfo(t.categoria);
                    return (
                        <div key={t.id} className="flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)]">
                            <div className={`${color} p-2 rounded-full text-white`}><Icon size={16}/></div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{t.descricao || t.categoria}</div>
                                <div className="text-xs text-[var(--text-secondary)]">{t.banco} · {format(t.data_hora, 'dd/MM')}</div>
                            </div>
                            <div className={`font-bold ${t.movimento === 'Entrada' ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                                {t.movimento === 'Entrada' ? '+' : '-'}{showValues ? formatCurrency(t.valor) : '••••'}
                            </div>
                            {!t.confirmado && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded">Pendente</span>}
                        </div>
                    )
                })}
            </div>
        )}
      </div>
    </div>
  );
}
