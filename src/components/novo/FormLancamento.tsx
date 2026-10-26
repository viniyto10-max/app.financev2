import { useState } from 'react';
import { Send, Link as LinkIcon, ArrowUpCircle, ArrowDownCircle, Check } from 'lucide-react';
import { enviarParaWebhook } from '../../services/webhookService';
import { format } from 'date-fns';
import { FORMAS_PAGAMENTO, isCartao } from '../../lib/constants';
import { gerarParcelas } from '../../lib/parcelas';
import { formatCurrency } from '../../lib/utils';
import { useLancamentos } from '../../hooks/useLancamentos';
import { Transaction } from '../../types';

const CATEGORIAS = [
  'Academia',
  'Assinaturas digitais',
  'Àgua',
  'Chacará',
  'Combustivel',
  'Consultas médicas',
  'Contas da Casa',
  'Cuidados pessoais',
  'Delivery',
  'Dinheiro',
  'Energia',
  'Estudos',
  'Farmácia',
  'Internet',
  'Mercado Livre',
  'Móveis e Eletrodomésticos',
  'Produtos de limpeza',
  'Salário',
  'Suprimentos',
  'Utilidades',
  'Vestuário'
];
const RESPONSAVEIS = ['Ahyslla Vascaina', 'Marcos Andrade'];
const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function FormLancamento({ onOpenIntegracoes }: { onOpenIntegracoes: () => void }) {
  const { adicionarLancamentos, recarregar, showToast } = useLancamentos();
  const [tipo, setTipo] = useState<'Entrada' | 'Saída'>('Saída');
  const [dataHora, setDataHora] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [valor, setValor] = useState('');
  const [banco, setBanco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [descricao, setDescricao] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [proximaFatura, setProximaFatura] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);

  const isCartaoSelected = tipo === 'Saída' && isCartao(banco);
  const isParcelado = isCartaoSelected && parcelas > 1;
  const numValor = parseFloat(valor.replace(',', '.')) || 0;

  // Cálculo da prévia de parcelas
  let previewParcelas = '';
  if (isParcelado && numValor > 0) {
    try {
      const parc = gerarParcelas({
        valorTotal: numValor,
        parcelas,
        dataCompra: new Date(dataHora),
        proximaFatura,
      });
      const valorPrimeira = formatCurrency(parc[0].valor);
      const datasFormatadas = parc.map(p => format(p.data, 'dd/MM'));
      const datasStr = parc.length <= 4 
        ? datasFormatadas.join(', ')
        : `${datasFormatadas.slice(0, 3).join(', ')}, ...`;
      previewParcelas = `${parcelas}x de ${valorPrimeira} · ${datasStr}`;
    } catch {
      previewParcelas = '';
    }
  }

  let previewDataUnica = '';
  if (isCartaoSelected && !isParcelado && proximaFatura && numValor > 0) {
    const [p] = gerarParcelas({
      valorTotal: numValor,
      parcelas: 1,
      dataCompra: new Date(dataHora),
      proximaFatura,
    });
    previewDataUnica = `Será lançado em ${format(p.data, 'dd/MM/yyyy')} (próxima fatura)`;
  }

  const handleTipoChange = (novoTipo: 'Entrada' | 'Saída') => {
    setTipo(novoTipo);
    if (novoTipo === 'Entrada') {
      setParcelas(1);
      setProximaFatura(false);
    }
  };

  const handleBancoChange = (novoBanco: string) => {
    setBanco(novoBanco);
    if (!isCartao(novoBanco)) {
      setParcelas(1);
      setProximaFatura(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const webhookUrl = localStorage.getItem('webhook_url');
    if (!webhookUrl) {
      alert("Configure a URL do webhook para enviar os dados.");
      onOpenIntegracoes();
      return;
    }

    if (numValor <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    const n = isCartaoSelected ? parcelas : 1;
    if (n < 1 || n > 24) {
      alert("O número de parcelas deve ser entre 1 e 24.");
      return;
    }

    const parcelasCalculadas = gerarParcelas({
      valorTotal: numValor,
      parcelas: n,
      dataCompra: new Date(dataHora),
      proximaFatura: isCartaoSelected ? proximaFatura : false,
    });

    for (const p of parcelasCalculadas) {
      if (p.valor < 0.01) {
        alert("Nenhuma parcela pode ter valor menor que R$ 0,01.");
        return;
      }
    }

    const idCompra = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setLoading(true);

    const novosLancamentos: Transaction[] = [];

    let index = 0;
    for (const parcela of parcelasCalculadas) {
      index++;
      setLoadingProgress(`Enviando ${index}/${n}...`);

      if (index > 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const descricaoFinal = n > 1
        ? (descricao.trim() ? `${descricao.trim()} (${index}/${n})` : `${categoria} (${index}/${n})`)
        : descricao;

      const payload = {
        data_hora: format(parcela.data, 'dd/MM/yyyy HH:mm:ss'),
        data_compra: format(new Date(dataHora), 'dd/MM/yyyy HH:mm:ss'),
        movimento: tipo,
        banco,
        categoria,
        responsavel,
        descricao: descricaoFinal,
        valor: Number(parcela.valor),
        confirmado: Boolean(confirmado),
        parcela_atual: parcela.numero,
        total_parcelas: n,
        id_compra: idCompra,
      };

      try {
        await enviarParaWebhook(webhookUrl, payload);
        novosLancamentos.push({
          id: `${idCompra}-${parcela.numero}`,
          data_hora: parcela.data,
          data_compra: new Date(dataHora),
          movimento: tipo,
          banco,
          categoria,
          responsavel,
          descricao: descricaoFinal,
          valor: Number(parcela.valor),
          confirmado: Boolean(confirmado),
          id_compra: idCompra,
          parcela_atual: parcela.numero,
          total_parcelas: n,
        });
      } catch (err) {
        console.error(err);
        alert(`Erro ao enviar a parcela ${index} de ${n}. ${index - 1} já foram salvas. Verifique a planilha.`);
        if (novosLancamentos.length > 0) {
          adicionarLancamentos(novosLancamentos);
        }
        setLoading(false);
        setLoadingProgress(null);
        return;
      }
    }

    // Adiciona instantaneamente todos os novos lançamentos ao estado compartilhado do app
    adicionarLancamentos(novosLancamentos);

    showToast(
      n > 1 ? `${n} parcelas salvas e sincronizadas!` : 'Lançamento salvo e sincronizado!',
      'success'
    );

    // Dispara recarregamento em segundo plano sem bloquear a UI
    recarregar(true);

    setValor('');
    setDescricao('');
    setParcelas(1);
    setProximaFatura(false);
    setLoading(false);
    setLoadingProgress(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-[var(--text-primary)]">
      <div className="flex justify-end">
        <button 
          type="button" 
          onClick={onOpenIntegracoes} 
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <LinkIcon size={14}/> Integrações
        </button>
      </div>
      
      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Tipo de Movimentação</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            type="button" 
            onClick={() => handleTipoChange('Entrada')} 
            className={`flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              tipo === 'Entrada' 
                ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]' 
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            <ArrowUpCircle size={20}/> Entrada
          </button>
          <button 
            type="button" 
            onClick={() => handleTipoChange('Saída')} 
            className={`flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              tipo === 'Saída' 
                ? 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]' 
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            <ArrowDownCircle size={20}/> Saída
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Data da compra</label>
          <input 
            type="datetime-local" 
            value={dataHora} 
            onChange={e => setDataHora(e.target.value)} 
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)]" 
            required 
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
            {isParcelado ? 'Valor total' : 'Valor'}
          </label>
          <input 
            type="number" 
            step="0.01" 
            inputMode="decimal"
            placeholder="0,00" 
            value={valor} 
            onChange={e => setValor(e.target.value)} 
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)]" 
            required 
          />
          {isParcelado && previewParcelas && (
            <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-tight">
              {previewParcelas}
            </div>
          )}
          {previewDataUnica && (
            <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-tight">
              {previewDataUnica}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Forma de pagamento</label>
          <select 
            value={banco} 
            onChange={e => handleBancoChange(e.target.value)} 
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer" 
            required
          >
            <option value="" disabled>Selecione a forma de pagamento</option>
            {FORMAS_PAGAMENTO.map(b => <option key={b} value={b} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{b}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Categoria</label>
          <select 
            value={categoria} 
            onChange={e => setCategoria(e.target.value)} 
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer" 
            required
          >
            <option value="" disabled>Selecione a categoria</option>
            {CATEGORIAS.map(c => <option key={c} value={c} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Campo Parcelas (exibido somente quando Saída e Forma de pagamento é Cartão) */}
      {isCartaoSelected && (
        <div className="p-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Parcelas</label>
            <select
              value={parcelas}
              onChange={e => setParcelas(Number(e.target.value))}
              className="w-full px-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer"
            >
              {OPCOES_PARCELAS.map(p => (
                <option key={p} value={p} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  {p}x
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Primeira parcela na próxima fatura
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={proximaFatura}
              onClick={() => setProximaFatura(!proximaFatura)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                proximaFatura ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  proximaFatura ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Responsável</label>
        <select 
          value={responsavel} 
          onChange={e => setResponsavel(e.target.value)} 
          className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer" 
          required
        >
          <option value="" disabled>Selecione o responsável</option>
          {RESPONSAVEIS.map(r => <option key={r} value={r} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{r}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Descrição</label>
        <textarea 
          placeholder="Descreva a transação..." 
          value={descricao} 
          onChange={e => setDescricao(e.target.value)} 
          className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-[10px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] resize-none h-24" 
        />
      </div>

      <div 
        onClick={() => setConfirmado(!confirmado)}
        className="flex items-center gap-3 p-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl cursor-pointer select-none"
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${confirmado ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'}`}>
          {confirmado && <Check size={12} strokeWidth={3} />}
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">Confirmar transação</span>
      </div>

      <button 
        type="submit" 
        disabled={loading} 
        className="w-full h-12 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,.3)] hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60"
      >
        {loading ? (loadingProgress || 'Salvando...') : <><Send size={18}/> Salvar Registro</>}
      </button>
    </form>
  );
}
