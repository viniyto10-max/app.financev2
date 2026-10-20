import { LayoutDashboard, ReceiptText, Plus, PieChart, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="relative w-full z-40 bg-[var(--nav-bg)] border-t border-[var(--border)] px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-around items-center">
      <button onClick={() => navigate('/')} className="p-2 cursor-pointer transition-opacity hover:opacity-80" aria-label="Dashboard">
        <LayoutDashboard size={24} color={isActive('/') ? 'var(--nav-icon-active)' : 'var(--nav-icon)'} />
      </button>
      <button onClick={() => navigate('/lancamentos')} className="p-2 cursor-pointer transition-opacity hover:opacity-80" aria-label="Lançamentos">
        <ReceiptText size={24} color={isActive('/lancamentos') ? 'var(--nav-icon-active)' : 'var(--nav-icon)'} />
      </button>
      <div 
        className="bg-[var(--primary)] p-3.5 rounded-full -mt-8 text-white shadow-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0" 
        onClick={() => navigate('/novo')}
        aria-label="Novo Lançamento"
      >
        <Plus size={24} />
      </div>
      <button onClick={() => navigate('/categorias')} className="p-2 cursor-pointer transition-opacity hover:opacity-80" aria-label="Categorias">
        <PieChart size={24} color={isActive('/categorias') ? 'var(--nav-icon-active)' : 'var(--nav-icon)'} />
      </button>
      <button onClick={() => navigate('/analises')} className="p-2 cursor-pointer transition-opacity hover:opacity-80" aria-label="Análises">
        <BarChart3 size={24} color={isActive('/analises') ? 'var(--nav-icon-active)' : 'var(--nav-icon)'} />
      </button>
    </nav>
  );
}
