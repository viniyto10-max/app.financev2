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

export const CARTAO_ESTILOS: Record<string, { from: string; to: string }> = {
  "Mercado Pago Cartão": { from: "#009EE3", to: "#0067B8" },
  "Inter Cartão":        { from: "#FF8A00", to: "#E85D00" },
  "PicPay Cartão":       { from: "#21C25E", to: "#0E8F3F" },
  "Banese Cartão":       { from: "#1E5AA8", to: "#0F3A75" },
  "Caixa Cartão":        { from: "#0070B8", to: "#00457C" },
};

export const CARTAO_ESTILO_PADRAO = { from: "#334155", to: "#0F172A" };

export const FOTOS_RESPONSAVEIS: Record<string, string> = {
  "Ahyslla Vascaina": "/public/assets/aistudio/AirBrush_20251212195427_8acd5982.jpg",
  "Marcos Andrade": "/public/assets/aistudio/AirBrush_20251128181808_70e5291d.jpg",
};


