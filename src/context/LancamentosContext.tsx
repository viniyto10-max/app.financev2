import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types';
import { parseBRL } from '../lib/utils';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

interface LancamentosContextType {
  lancamentos: Transaction[];
  loading: boolean;
  erro: string | null;
  recarregar: (isBackground?: boolean) => Promise<void>;
  lastUpdated: Date;
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
      movimento,
      banco: headerMap.banco ? String(row[headerMap.banco] || '') : '',
      categoria: headerMap.categoria ? String(row[headerMap.categoria] || '') : '',
      responsavel: headerMap.responsavel ? String(row[headerMap.responsavel] || '') : '',
      descricao: headerMap.descricao ? String(row[headerMap.descricao] || '') : '',
      valor,
      confirmado,
    };

    mapById.set(id, tx);
  }

  return Array.from(mapById.values());
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
            data_hora: new Date(t.data_hora)
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

  const [loading, setLoading] = useState<boolean>(() => lancamentos.length === 0);
  const [erro, setErro] = useState<string | null>(null);

  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lancamentosRef = useRef<Transaction[]>(lancamentos);
  lancamentosRef.current = lancamentos;

  const recarregar = useCallback(async (isBackground = false) => {
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    if (!isBackground && lancamentosRef.current.length === 0) {
      setLoading(true);
    }
    setErro(null);

    const promise = (async () => {
      try {
        const csvText = await fetchCsvTextParallel();
        if (!csvText) {
          throw new Error('Não foi possível carregar os dados da planilha.');
        }

        await new Promise<void>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: Papa.ParseResult<any>) => {
              try {
                const headerMap = buildHeaderMap(results.meta.fields || []);
                const parsedData = processRows(results.data as any[], headerMap);

                const nowTs = Date.now();
                const now = new Date(nowTs);

                setLancamentos(parsedData);
                lancamentosRef.current = parsedData;
                setLastUpdated(now);
                lastFetchTimeRef.current = nowTs;

                saveToCache(parsedData, nowTs);
                resolve();
              } catch (e: any) {
                reject(e);
              }
            },
            error: (err: Error) => {
              reject(err);
            }
          });
        });
      } catch (err: any) {
        console.error('Fetch error:', err);
        if (lancamentosRef.current.length === 0) {
          setErro('Erro ao carregar dados. Verifique sua conexão.');
        }
      } finally {
        setLoading(false);
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    const hasCache = lancamentosRef.current.length > 0;
    recarregar(hasCache);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch > 60000) {
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
    <LancamentosContext.Provider value={{ lancamentos, loading, erro, recarregar, lastUpdated }}>
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
