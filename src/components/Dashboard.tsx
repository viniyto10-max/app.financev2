import { useFinancialData } from '../hooks/useFinancialData';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data, loading, error } = useFinancialData();

  const totalEntrada = data.filter(t => t.movimento === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
  const totalSaida = data.filter(t => t.movimento === 'Saída').reduce((sum, t) => sum + t.valor, 0);
  const saldo = totalEntrada - totalSaida;

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="bg-yellow-100 p-2 rounded">Modo demonstração: {error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <h2 className="text-sm">Entradas</h2>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEntrada)}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <h2 className="text-sm">Saídas</h2>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSaida)}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <h2 className="text-sm">Saldo</h2>
            <p className="text-2xl font-bold">{formatCurrency(saldo)}</p>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold mb-2">Entradas vs Saídas</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: 'Total', entrada: totalEntrada, saida: totalSaida }]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="entrada" fill="#16a34a" name="Entrada" />
              <Bar dataKey="saida" fill="#dc2626" name="Saída" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
