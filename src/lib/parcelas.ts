import { addMonths } from 'date-fns';

export interface ParcelaInfo {
  numero: number;
  valor: number;
  data: Date;
}

export interface GerarParcelasParams {
  valorTotal: number;
  parcelas: number;
  dataCompra: Date;
  proximaFatura?: boolean;
}

export function gerarParcelas({
  valorTotal,
  parcelas,
  dataCompra,
  proximaFatura = false,
}: GerarParcelasParams): ParcelaInfo[] {
  if (parcelas <= 1) {
    return [
      {
        numero: 1,
        valor: valorTotal,
        data: proximaFatura ? addMonths(dataCompra, 1) : dataCompra,
      },
    ];
  }

  const totalCentavos = Math.round(valorTotal * 100);
  const base = Math.floor(totalCentavos / parcelas);
  const resto = totalCentavos - base * parcelas;

  const resultado: ParcelaInfo[] = [];

  for (let i = 1; i <= parcelas; i++) {
    const centavosParcela = i === parcelas ? base + resto : base;
    const valorParcela = centavosParcela / 100;

    const mesesAdicionar = (i - 1) + (proximaFatura ? 1 : 0);
    const dataParcela = addMonths(dataCompra, mesesAdicionar);

    resultado.push({
      numero: i,
      valor: valorParcela,
      data: dataParcela,
    });
  }

  return resultado;
}
