import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types';
import { mockData } from '../data/mockData';
import { parseBRL } from '../lib/utils';
import { parse } from 'date-fns';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

export function useFinancialData() {
  const [data, setData] = useState<Transaction[]>(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SHEET_CSV_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          const parsedData: Transaction[] = results.data.map((row: any, index: number) => ({
            id: index.toString(),
            data_hora: parse(row['Carimbo data/hora'], 'dd/MM/yyyy HH:mm:ss', new Date()),
            movimento: row['Movimento'],
            banco: row['Banco'],
            categoria: row['Categoria'],
            responsavel: row['Responsável'],
            descricao: row['Descrição'],
            valor: parseBRL(row['Valor']),
            confirmado: true
          }));
          setData(parsedData);
          setLastUpdated(new Date());
        },
        error: (err: Error) => {
          throw new Error(err.message);
        }
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados. Usando modo demonstração.');
      setData(mockData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData, lastUpdated };
}
