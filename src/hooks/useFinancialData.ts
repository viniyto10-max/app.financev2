import { useLancamentos } from './useLancamentos';

export function useFinancialData() {
  const { lancamentos, loading, erro, recarregar, lastUpdated } = useLancamentos();
  return { data: lancamentos, loading, error: erro, refresh: recarregar, lastUpdated };
}
