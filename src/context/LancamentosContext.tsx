import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types';
import { parseBRL } from '../lib/utils';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

export type SyncStatus = 'sincronizado' | 'atualizando' | 'falha' | 'desatualizado' | 'pendente';

export interface ToastInfo {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

interface LancamentosContextType {
  lancamentos: Transaction[];
  loading: boolean;
  erro: string | null;
  recarregar: (isBackground?: boolean) => Promise<{ success: boolean; count: number; error?: string }>;
  lastUpdated: Date;
  lastSuccessfulSync: Date | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  adicionarLancamentos: (novos: Transaction[]) => void;
  toast: ToastInfo | null;
  clearToast: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isRefreshing: boolean;
}

const LancamentosContext = createContext<LancamentosContextType | null>(null);

const normalizeKey = (k: string) => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface HeaderMap {
  data: string | null;
  movimento: string | null;
  banco: string | null;
  categoria: string | null;
  responsavel: string | null;
  descricao: string | null;
  valor: string | null;
  confirmado: string | null;
  idCompra: string | null;
  parcelaAtual: string | null;
  totalParcelas: string | null;
  dataCompra: string | null;
}

const buildHeaderMap = (fields: string[] = []): HeaderMap => {
  const findField = (candidates: string[]) => {
    const candidateNorms = candidates.map(normalizeKey);
    return fields.find(f => candidateNorms.includes(normalizeKey(f))) || null;
  };

  return {
    data: findField(['Carimbo data/hora', 'Data', 'Data e Hora']),
    movimento: findField(['Movimento', 'Tipo']),
    banco: findField(['Banco', 'Forma de pagamento', 'forma de pagamento']),
    categoria: findField(['Categoria']),
    responsavel: findField(['Responsável', 'Responsavel']),
    descricao: findField(['Descrição', 'Descricao']),
    valor: findField(['Valor']),
    confirmado: findField(['Confirmado']),
    idCompra: findField(['id_compra', 'ID Compra', 'id']),
    parcelaAtual: findField(['parcela_atual', 'Parcela atual', 'parcela']),
    totalParcelas: findField(['total_parcelas', 'Total parcelas']),
    dataCompra: findField(['data_compra', 'Data da compra', 'Data compra']),
  };
};

const parseDateFast = (str: string): Date => {
  if (!str) return new Date();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    const h = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const s = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(y, m, d, h, min, s);
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const processRows = (rows: any[], headerMap: HeaderMap): Transaction[] => {
  const mapById = new Map<string, Transaction>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rawData = headerMap.data ? row[headerMap.data] : null;
    if (!rawData) continue;

    const rawMovimento = headerMap.movimento ? row[headerMap.movimento] : '';
    const movimento = String(rawMovimento).toLowerCase() === 'entrada' ? 'Entrada' : 'Saída';

    const rawConfirmado = headerMap.confirmado ? row[headerMap.confirmado] : 'true';
    const confirmado = typeof rawConfirmado === 'boolean'
      ? rawConfirmado
      : ['true', 'sim', 'TRUE'].includes(String(rawConfirmado).toLowerCase());

    const idCompra = headerMap.idCompra ? String(row[headerMap.idCompra] || '').trim() : '';
    const parcelaAtual = headerMap.parcelaAtual ? String(row[headerMap.parcelaAtual] || '').trim() : '';

    const id = idCompra ? `${idCompra}-${parcelaAtual || 1}` : `row-${i}`;

    const rawValor = headerMap.valor ? row[headerMap.valor] : '0';
    const valor = parseBRL(String(rawValor || '0'));

    const tx: Transaction = {
      id,
      data_hora: parseDateFast(String(rawData)),
      data_compra: headerMap.dataCompra && row[headerMap.dataCompra] ? parseDateFast(String(row[headerMap.dataCompra])) : undefined,
      movimento,
      banco: headerMap.banco ? String(row[headerMap.banco] || '') : '',
      categoria: headerMap.categoria ? String(row[headerMap.categoria] || '') : '',
      responsavel: headerMap.responsavel ? String(row[headerMap.responsavel] || '') : '',
      descricao: headerMap.descricao ? String(row[headerMap.descricao] || '') : '',
      valor,
      confirmado,
      id_compra: idCompra || undefined,
      parcela_atual: parcelaAtual ? Number(parcelaAtual) || 1 : undefined,
      total_parcelas: headerMap.totalParcelas && row[headerMap.totalParcelas] ? Number(row[headerMap.totalParcelas]) || undefined : undefined,
    };

    mapById.set(id, tx);
  }

  return Array.from(mapById.values());
};

const getPendingLocalLancamentos = (): Transaction[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('pending_local_lancamentos');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => ({
      ...t,
      data_hora: new Date(t.data_hora),
      data_compra: t.data_compra ? new Date(t.data_compra) : undefined,
    }));
  } catch {
    return [];
  }
};

const savePendingLocalLancamentos = (pending: Transaction[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pending_local_lancamentos', JSON.stringify(pending));
  } catch (err) {
    console.error('Error saving pending local lancamentos', err);
  }
};

const saveToCache = (data: Transaction[], timestamp: number) => {
  const save = () => {
    try {
      localStorage.setItem('lancamentos_cache', JSON.stringify(data));
      localStorage.setItem('lancamentos_cache_ts', String(timestamp));
    } catch (err) {
      console.error('Error saving cache', err);
    }
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(save);
  } else {
    setTimeout(save, 50);
  }
};

const fetchCsvTextParallel = async (): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const bust = `_=${Date.now()}`;

  const fetchResource = async (url: string): Promise<string> => {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  };

  try {
    const result = await Promise.any([
      fetchResource(`/api/sheet-csv?${bust}`),
      fetchResource(`${SHEET_CSV_URL}&${bust}`),
    ]);
    controller.abort();
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const LancamentosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lancamentos, setLancamentos] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('lancamentos_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((t: any) => ({
            ...t,
            data_hora: new Date(t.data_hora),
            data_compra: t.data_compra ? new Date(t.data_compra) : undefined,
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(() => {
    const cachedTs = localStorage.getItem('lancamentos_cache_ts');
    if (cachedTs) {
      const ts = Number(cachedTs);
      if (!isNaN(ts) && ts > 0) return new Date(ts);
    }
    return new Date();
  });

  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const ts = localStorage.getItem('last_successful_sync_ts');
    if (ts) {
      const num = Number(ts);
      if (!isNaN(num) && num > 0) return new Date(num);
    }
    const cachedTs = localStorage.getItem('lancamentos_cache_ts');
    if (cachedTs) {
      const num = Number(cachedTs);
      if (!isNaN(num) && num > 0) return new Date(num);
    }
    return null;
  });

  const [pendingCount, setPendingCount] = useState<number>(() => {
    return getPendingLocalLancamentos().length;
  });

  const [loading, setLoading] = useState<boolean>(() => lancamentos.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const syncStatus: SyncStatus = useMemo(() => {
    if (isRefreshing || (loading && lancamentos.length === 0)) {
      return 'atualizando';
    }
    if (pendingCount > 0) {
      return 'pendente';
    }
    if (erro) {
      return 'falha';
    }
    if (lastSuccessfulSync) {
      const diffMs = Date.now() - lastSuccessfulSync.getTime();
      if (diffMs > 2 * 60 * 60 * 1000) {
        return 'desatualizado';
      }
    } else {
      return 'desatualizado';
    }
    return 'sincronizado';
  }, [isRefreshing, loading, lancamentos.length, pendingCount, erro, lastSuccessfulSync]);

  const fetchPromiseRef = useRef<Promise<{ success: boolean; count: number; error?: string }> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lancamentosRef = useRef<Transaction[]>(lancamentos);
  lancamentosRef.current = lancamentos;

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Adiciona um ou mais lançamentos otimistas ao estado e guarda localmente até que apareçam na planilha
  const adicionarLancamentos = useCallback((novos: Transaction[]) => {
    if (!novos || novos.length === 0) return;

    const pendingBefore = getPendingLocalLancamentos();
    const existingIds = new Set(pendingBefore.map(t => t.id));
    
    const newPending = [...pendingBefore];
    for (const t of novos) {
      if (!existingIds.has(t.id)) {
        newPending.push(t);
        existingIds.add(t.id);
      }
    }
    savePendingLocalLancamentos(newPending);

    // Atualiza estado local imediatamente (0ms de atraso nas telas e gráficos)
    setLancamentos(prev => {
      const map = new Map<string, Transaction>();
      // Adiciona novos primeiro
      for (const t of novos) {
        map.set(t.id, t);
      }
      // Adiciona anteriores se não estiverem no mapa
      for (const t of prev) {
        if (!map.has(t.id)) {
          map.set(t.id, t);
        }
      }
      const combined = Array.from(map.values());
      // Ordena por data decrescente
      combined.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
      lancamentosRef.current = combined;
      saveToCache(combined, Date.now());
      return combined;
    });

    setLastUpdated(new Date());
    setPendingCount(getPendingLocalLancamentos().length);
  }, []);

  const recarregar = useCallback(async (isBackground = false): Promise<{ success: boolean; count: number; error?: string }> => {
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    if (!isBackground) {
      if (lancamentosRef.current.length === 0) {
        setLoading(true);
      }
      setIsRefreshing(true);
    }
    setErro(null);

    const promise = (async (): Promise<{ success: boolean; count: number; error?: string }> => {
      try {
        const csvText = await fetchCsvTextParallel();
        if (!csvText) {
          throw new Error('Não foi possível carregar os dados da planilha.');
        }

        const result = await new Promise<{ success: boolean; count: number; error?: string }>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: Papa.ParseResult<any>) => {
              try {
                const headerMap = buildHeaderMap(results.meta.fields || []);
                const csvData = processRows(results.data as any[], headerMap);

                // CSV Data Map para rápida verificação de existência
                const csvIdSet = new Set(csvData.map(t => t.id));

                // Verifica pendências locais e remove as que já foram incorporadas pelo Google Sheets
                const pendingLocal = getPendingLocalLancamentos();
                const remainingPending: Transaction[] = [];

                for (const item of pendingLocal) {
                  if (csvIdSet.has(item.id)) {
                    // Já apareceu na planilha! Remove da lista pendente local.
                  } else {
                    // Ainda não apareceu na planilha; mantém localmente
                    remainingPending.push(item);
                  }
                }
                savePendingLocalLancamentos(remainingPending);

                // Junta CSV Data com pendências locais ainda não sincronizadas no CSV
                const mapFinal = new Map<string, Transaction>();
                for (const item of csvData) {
                  mapFinal.set(item.id, item);
                }
                for (const item of remainingPending) {
                  if (!mapFinal.has(item.id)) {
                    mapFinal.set(item.id, item);
                  }
                }

                const mergedData = Array.from(mapFinal.values());
                mergedData.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());

                const nowTs = Date.now();
                const now = new Date(nowTs);

                setLancamentos(mergedData);
                lancamentosRef.current = mergedData;
                setLastUpdated(now);
                setLastSuccessfulSync(now);
                localStorage.setItem('last_successful_sync_ts', String(nowTs));
                setPendingCount(getPendingLocalLancamentos().length);
                lastFetchTimeRef.current = nowTs;

                saveToCache(mergedData, nowTs);

                resolve({ success: true, count: mergedData.length });
              } catch (e: any) {
                reject(e);
              }
            },
            error: (err: Error) => {
              reject(err);
            }
          });
        });

        if (!isBackground) {
          showToast('Dados atualizados com sucesso!', 'success');
        }

        return result;
      } catch (err: any) {
        console.error('Fetch error:', err);
        const errMsg = 'Erro ao atualizar dados. Exibindo dados em cache.';
        if (lancamentosRef.current.length === 0) {
          setErro('Erro ao carregar dados. Verifique sua conexão.');
        } else if (!isBackground) {
          showToast(errMsg, 'error');
        }
        return { success: false, count: lancamentosRef.current.length, error: err?.message || errMsg };
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, [showToast]);

  useEffect(() => {
    const hasCache = lancamentosRef.current.length > 0;
    recarregar(hasCache);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch > 30000) {
          recarregar(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recarregar]);

  return (
    <LancamentosContext.Provider value={{
      lancamentos,
      loading,
      erro,
      recarregar,
      lastUpdated,
      lastSuccessfulSync,
      syncStatus,
      pendingCount,
      adicionarLancamentos,
      toast,
      clearToast,
      showToast,
      isRefreshing
    }}>
      {children}
    </LancamentosContext.Provider>
  );
};

export const useLancamentosContext = () => {
  const context = useContext(LancamentosContext);
  if (!context) {
    throw new Error('useLancamentosContext must be used within a LancamentosProvider');
  }
  return context;
};

