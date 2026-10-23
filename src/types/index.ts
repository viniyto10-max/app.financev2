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
  data_compra?: Date;
  id_compra?: string;
  parcela_atual?: number;
  total_parcelas?: number;
}

export type Period = 'Este mês' | 'Mês passado' | 'Últimos 3 meses' | 'Este ano' | 'Personalizado';
