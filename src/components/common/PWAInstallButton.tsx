import React, { useState } from 'react';
import { Download, Check, X, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold">
        <Check size={14} /> Aplicativo Instalado
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={
          compact
            ? "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors cursor-pointer font-medium"
            : "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] hover:opacity-90 transition-opacity text-xs font-bold cursor-pointer shadow-sm"
        }
        title="Instalar aplicativo"
      >
        <Download size={15} />
        <span>Instalar aplicativo</span>
      </button>

      {/* Modal com instruções caso o navegador não abra prompt nativo diretamente */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-[var(--primary)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Instalar Minhas Economias</h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              {isIOS ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <Smartphone size={16} className="text-[var(--primary)]" /> No iPhone / iPad (Safari):
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima) na barra do Safari.</li>
                    <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Confirme no canto superior direito para instalar.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <Smartphone size={16} className="text-[var(--primary)]" /> No Google Chrome (Celular):
                    </div>
                    <p className="leading-relaxed pl-1">
                      Toque no menu <strong>⋮</strong> (três pontinhos no topo à direita) e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-[var(--border)] pt-2">
                    <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <Monitor size={16} className="text-[var(--primary)]" /> No Google Chrome (Computador):
                    </div>
                    <p className="leading-relaxed pl-1">
                      Clique no ícone de <strong>instalação</strong> no canto direito da barra de endereço ou abra o menu <strong>⋮ &gt; "Instalar Minhas Economias..."</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 bg-[var(--primary)] text-white rounded-xl text-xs font-bold hover:opacity-95 transition-opacity cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
