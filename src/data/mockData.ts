import { Transaction } from '../types';

export const mockData: Transaction[] = [
  {
    id: '1',
    data_hora: new Date(2026, 9, 15, 10, 30),
    movimento: 'Saída',
    banco: 'Pix',
    categoria: 'Mercado',
    responsavel: 'Ahyslla Vascaina',
    descricao: 'Compras do mês',
    valor: 450.50,
    confirmado: true,
  },
  {
    id: '2',
    data_hora: new Date(2026, 9, 16, 14, 0),
    movimento: 'Entrada',
    banco: 'Inter',
    categoria: 'Salário',
    responsavel: 'Marcos Andrade',
    descricao: 'Salário mensal',
    valor: 5000.00,
    confirmado: true,
  },
  {
    id: '3',
    data_hora: new Date(2026, 9, 17, 18, 45),
    movimento: 'Saída',
    banco: 'Picpay',
    categoria: 'Assinaturas',
    responsavel: 'Ahyslla Vascaina',
    descricao: 'Netflix',
    valor: 55.90,
    confirmado: true,
  },
];
