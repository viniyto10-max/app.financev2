export interface Transaction {
  id: string;
  data_hora: Date;
  movimento: 'Entrada' | 'Saída';
  banco: string;
  categoria: string;
  responsavel: string;
  descricao: string;
  valor: number;
  confirmado: boolean;
}

export type Period = 'Este mês' | 'Mês passado' | 'Últimos 3 meses' | 'Este ano' | 'Personalizado';
