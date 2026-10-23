import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDataExibicao = (t: Transaction): Date => t.data_compra ?? t.data_hora;

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date) => {
  return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
};

export const parseBRL = (value: string): number => {
  // R$ 1.234,56 -> 1234.56
  const clean = value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(clean) || 0;
};
