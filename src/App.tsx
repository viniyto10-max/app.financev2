/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lancamentos from './pages/Lancamentos';
import Categorias from './pages/Categorias';
import Analises from './pages/Analises';
import NovoLancamento from './pages/NovoLancamento';
import BottomNav from './components/common/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-[100dvh] w-full justify-center bg-[var(--bg-page)]">
        <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[var(--bg-app)] shadow-[var(--shadow)]">
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden app-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/analises" element={<Analises />} />
              <Route path="/novo" element={<NovoLancamento />} />
            </Routes>
          </main>
          <footer className="relative z-50 shrink-0">
            <BottomNav />
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}
