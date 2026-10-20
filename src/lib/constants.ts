export const FORMAS_PAGAMENTO = [
  "Inter Cartão",
  "Mercado Pago Cartão",
  "PicPay Cartão",
  "Banese Cartão",
  "Caixa Cartão",
  "Inter (conta)",
  "Caixa (conta)",
  "Pix",
  "Dinheiro",
];

export const CARTOES = [
  "Inter Cartão",
  "Mercado Pago Cartão",
  "PicPay Cartão",
  "Banese Cartão",
  "Caixa Cartão",
];

export const isCartao = (valor: string): boolean => {
  if (!valor) return false;
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const valNorm = normalize(valor);
  
  const cartoesNorm = CARTOES.map(c => normalize(c));
  if (cartoesNorm.includes(valNorm)) return true;
  
  return valNorm.includes('cartao') || valNorm.includes('credito');
};
