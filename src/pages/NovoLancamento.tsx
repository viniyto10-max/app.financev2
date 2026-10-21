import FormLancamento from '../components/novo/FormLancamento';
import ModalIntegracoes from '../components/novo/ModalIntegracoes';
import { useState } from 'react';

export default function NovoLancamento() {
  const [isIntegracoesOpen, setIsIntegracoesOpen] = useState(false);
  const webhookUrl = localStorage.getItem('webhook_url');

  return (
    <div className="flex flex-col space-y-4 pb-20 p-4">
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
  );
}
