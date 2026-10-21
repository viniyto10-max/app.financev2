/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Lancamentos from './pages/Lancamentos';
import Categorias from './pages/Categorias';
import Analises from './pages/Analises';
import NovoLancamento from './pages/NovoLancamento';
import BottomNav from './components/common/BottomNav';
import { ScreenHeader } from './components/common/ScreenHeader';
import { ReceiptText, Plus, PieChart, BarChart3 } from 'lucide-react';

function AppLayout() {
  const location = useLocation();
  const path = location.pathname;

  let headerConfig = null;
  if (path === '/lancamentos') {
    headerConfig = <ScreenHeader icon={<ReceiptText />} title="Lançamentos" subtitle="Todas as movimentações do mês" />;
  } else if (path === '/novo') {
    headerConfig = <ScreenHeader icon={<Plus />} title="Novo Lançamento" subtitle="Registre uma entrada ou saída" />;
  } else if (path === '/categorias') {
    headerConfig = <ScreenHeader icon={<PieChart />} title="Categorias" subtitle="Para onde seu dinheiro está indo" />;
  } else if (path === '/analises') {
    headerConfig = <ScreenHeader icon={<BarChart3 />} title="Análises" subtitle="Evolução das suas finanças" />;
  }

  return (
    <div className="flex h-[100dvh] w-full justify-center bg-[var(--bg-app)] sm:bg-[var(--bg-page)]">
      <div className="relative flex h-[100dvh] w-full sm:max-w-[440px] flex-col overflow-hidden bg-[var(--bg-app)] sm:shadow-[var(--shadow)] sm:border-x sm:border-[var(--border)]">
        {headerConfig && <div className="shrink-0 z-40">{headerConfig}</div>}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/analises" element={<Analises />} />
            <Route path="/novo" element={<NovoLancamento />} />
          </Routes>
        </main>
        <footer className="relative z-50 shrink-0 w-full">
          <BottomNav />
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
