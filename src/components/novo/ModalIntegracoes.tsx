import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { enviarParaWebhook } from '../../services/webhookService';
import { PWAInstallButton } from '../common/PWAInstallButton';

export default function ModalIntegracoes({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'connected' | 'not-configured'>('not-configured');

  useEffect(() => {
    const savedUrl = localStorage.getItem('webhook_url');
    if (savedUrl) {
      setUrl(savedUrl);
      setStatus('connected');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('webhook_url', url);
    setStatus(url ? 'connected' : 'not-configured');
    onClose();
  };

  const handleTest = async () => {
    if (!url) {
      alert('Insira uma URL primeiro.');
      return;
    }
    try {
      await enviarParaWebhook(url, { teste: true });
      alert('Teste enviado com sucesso!');
    } catch (e) {
      alert('Erro ao testar conexão.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl p-6 w-full max-w-sm shadow-[var(--shadow)]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Integrações</h2>
            <button onClick={onClose} className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={20}/></button>
        </div>
        
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">URL do Webhook</label>
        <input 
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] mb-4" 
            placeholder="https://..."
        />
        
        <div className="flex justify-between items-center mb-6">
            <span className={`text-sm flex items-center gap-1.5 ${status === 'connected' ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-[var(--primary)]' : 'bg-gray-400'}`}></span>
                {status === 'connected' ? 'Conectado' : 'Não configurado'}
            </span>
            <button 
              className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] hover:opacity-80 cursor-pointer transition-opacity" 
              onClick={handleTest}
            >
              Testar conexão
            </button>
        </div>

        <button 
          className="w-full bg-[var(--primary)] text-white h-12 rounded-xl font-bold flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity mb-4" 
          onClick={handleSave}
        >
          Salvar
        </button>

        <div className="border-t border-[var(--border)] pt-4">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Instalação no Celular / PC</label>
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
}
