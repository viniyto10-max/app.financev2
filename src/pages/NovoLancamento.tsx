import { useState } from 'react';
import FormLancamento from '../components/novo/FormLancamento';
import ModalIntegracoes from '../components/novo/ModalIntegracoes';
import ThemeToggle from '../components/common/ThemeToggle';

export default function NovoLancamento() {
  const [isIntegracoesOpen, setIsIntegracoesOpen] = useState(false);
  const webhookUrl = localStorage.getItem('webhook_url');

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] pb-32">
      <header className="py-3 px-5 flex justify-between items-center" style={{ background: 'var(--header-gradient)' }}>
        <h1 className="text-lg font-bold text-white">Novo Lançamento</h1>
        <ThemeToggle />
      </header>
      <div className="p-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-4">
          <FormLancamento onOpenIntegracoes={() => setIsIntegracoesOpen(true)} />
        </div>
        <ModalIntegracoes isOpen={isIntegracoesOpen} onClose={() => setIsIntegracoesOpen(false)} />
        {!webhookUrl && (
          <div className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Configure o Data Source para visualizar seus dados.
          </div>
        )}
      </div>
    </div>
  );
}
