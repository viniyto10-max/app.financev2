/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useLayoutEffect, useEffect, useRef, lazy, Suspense } from 'react';
import Home from './pages/Home';
import BottomNav from './components/common/BottomNav';
import { ScreenHeader } from './components/common/ScreenHeader';
import ToastNotification from './components/common/ToastNotification';
import PullToRefresh from './components/common/PullToRefresh';
import { ReceiptText, Plus, PieChart, BarChart3 } from 'lucide-react';

import { MonthProvider } from './components/common/MonthContext';
import { LancamentosProvider } from './context/LancamentosContext';

const Lancamentos = lazy(() => import('./pages/Lancamentos'));
const Categorias = lazy(() => import('./pages/Categorias'));
const Analises = lazy(() => import('./pages/Analises'));
const NovoLancamento = lazy(() => import('./pages/NovoLancamento'));

function PageFallback() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-36 bg-[var(--bg-card)] rounded-2xl w-full" />
      <div className="h-24 bg-[var(--bg-card)] rounded-2xl w-full" />
      <div className="h-48 bg-[var(--bg-card)] rounded-2xl w-full" />
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Ao montar o app e ao trocar de tela, forçar scrollLeft = 0 no shell, no <main> e no document.scrollingElement
  useLayoutEffect(() => {
    if (shellRef.current) shellRef.current.scrollLeft = 0;
    if (mainRef.current) mainRef.current.scrollLeft = 0;
    if (document.scrollingElement) document.scrollingElement.scrollLeft = 0;
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  }, [path]);

  // Pré-carregamento dinâmico das outras rotas em background após a montagem da Home
  useEffect(() => {
    const preload = () => {
      import('./pages/Lancamentos');
      import('./pages/Categorias');
      import('./pages/Analises');
      import('./pages/NovoLancamento');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(preload);
    } else {
      setTimeout(preload, 1000);
    }
  }, []);

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
    <MonthProvider>
      <div
        ref={shellRef}
        className="app-shell flex h-[100dvh] w-full flex-col bg-[var(--bg-app)] overflow-hidden relative"
      >
        <ToastNotification />
        {headerConfig && <div className="shrink-0 z-40 w-full">{headerConfig}</div>}
        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden app-content w-full"
        >
          <PullToRefresh containerRef={mainRef}>
            <Suspense fallback={<PageFallback />}>
              <div
                key={path}
                className="page-enter"
                onAnimationEnd={(e) => e.currentTarget.classList.remove('page-enter')}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/lancamentos" element={<Lancamentos />} />
                  <Route path="/categorias" element={<Categorias />} />
                  <Route path="/analises" element={<Analises />} />
                  <Route path="/novo" element={<NovoLancamento />} />
                </Routes>
              </div>
            </Suspense>
          </PullToRefresh>
        </main>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LancamentosProvider>
        <AppLayout />
      </LancamentosProvider>
    </BrowserRouter>
  );
}
