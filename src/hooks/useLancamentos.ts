import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types';
import { mockData } from '../data/mockData';
import { parseBRL } from '../lib/utils';
import { parse } from 'date-fns';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

const getRowValue = (row: any, keys: string[]) => {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    if (found && row[found] !== undefined) return row[found];
  }
  return '';
};

const normalizeTransaction = (row: any, index: number): Transaction => {
  const rawData = getRowValue(row, ['Carimbo data/hora', 'Data', 'Data e Hora']);
  const data = parse(rawData, 'dd/MM/yyyy HH:mm:ss', new Date());
  
  const rawMovimento = getRowValue(row, ['Movimento', 'Tipo']);
  const movimento = (rawMovimento.toLowerCase() === 'entrada') ? 'Entrada' : 'Saída';
  
  const rawConfirmado = getRowValue(row, ['Confirmado']) || 'true';
  const confirmado = typeof rawConfirmado === 'boolean' 
    ? rawConfirmado 
    : ['true', 'sim', 'TRUE'].includes(String(rawConfirmado).toLowerCase());

  return {
    id: index.toString(),
    data_hora: isNaN(data.getTime()) ? new Date() : data,
    movimento,
    banco: getRowValue(row, ['Banco', 'Forma de pagamento', 'forma de pagamento']),
    categoria: getRowValue(row, ['Categoria']),
    responsavel: getRowValue(row, ['Responsável', 'Responsavel']),
    descricao: getRowValue(row, ['Descrição', 'Descricao']),
    valor: parseBRL(getRowValue(row, ['Valor']) || '0'),
    confirmado
  };
};

export function useLancamentos() {
  const [lancamentos, setLancamentos] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('lancamentos_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.map((t: any) => ({
          ...t,
          data_hora: new Date(t.data_hora)
        }));
      } catch (e) {
        return mockData;
      }
    }
    return mockData;
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const recarregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch(SHEET_CSV_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          const parsedData: Transaction[] = (results.data as any[])
            .filter(row => getRowValue(row, ['Carimbo data/hora', 'Data', 'Data e Hora']))
            .map(normalizeTransaction);
          
          setLancamentos(parsedData);
          setLastUpdated(new Date());
          localStorage.setItem('lancamentos_cache', JSON.stringify(parsedData));
        },
        error: (err: Error) => {
          throw new Error(err.message);
        }
      });
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar dados. Usando dados locais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const interval = setInterval(recarregar, 60000);
    return () => clearInterval(interval);
  }, [recarregar]);

  return { lancamentos, loading, erro, recarregar, lastUpdated };
}
