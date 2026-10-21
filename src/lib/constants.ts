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

export const normalizeStr = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

export const isCartao = (valor: string): boolean => {
  if (!valor) return false;
  const valNorm = normalizeStr(valor);
  
  const cartoesNorm = CARTOES.map(c => normalizeStr(c));
  if (cartoesNorm.some(cn => valNorm.includes(cn) || cn.includes(valNorm))) return true;
  
  return valNorm.includes('cartao') || valNorm.includes('credito');
};

export const CARTAO_ESTILOS: Record<string, { from: string; to: string; color: string; shortName: string }> = {
  "Mercado Pago Cartão": { from: "#009EE3", to: "#0067B8", color: "#009EE3", shortName: "Mercado Pago" },
  "Inter Cartão":        { from: "#FF8A00", to: "#E85D00", color: "#FF8A00", shortName: "Inter" },
  "PicPay Cartão":       { from: "#21C25E", to: "#0E8F3F", color: "#21C25E", shortName: "PicPay" },
  "Banese Cartão":       { from: "#1E5AA8", to: "#0F3A75", color: "#1E5AA8", shortName: "Banese" },
  "Caixa Cartão":        { from: "#0070B8", to: "#00457C", color: "#0070B8", shortName: "Caixa" },
};

export const CARTAO_ESTILO_PADRAO = { from: "#334155", to: "#0F172A", color: "#64748B", shortName: "Cartão" };

// Função canônica para associar qualquer texto de banco/forma de pagamento ao cartão correspondente
export const matchCartao = (banco: string, listaCartoes: string[] = CARTOES): string | null => {
  if (!banco) return null;
  const bNorm = normalizeStr(banco);

  // 1. Testa match direto com a lista conhecida
  for (const c of listaCartoes) {
    const cNorm = normalizeStr(c);
    const cBrand = cNorm.replace('cartao', '').trim();
    if (bNorm === cNorm || bNorm === cBrand || (cBrand && bNorm.includes(cBrand))) {
      return c;
    }
  }

  // 2. Se tiver 'cartao' ou 'credito' no texto
  if (isCartao(banco)) {
    if (bNorm.includes('inter')) return "Inter Cartão";
    if (bNorm.includes('mercado')) return "Mercado Pago Cartão";
    if (bNorm.includes('picpay')) return "PicPay Cartão";
    if (bNorm.includes('banese')) return "Banese Cartão";
    if (bNorm.includes('caixa')) return "Caixa Cartão";
    return banco;
  }

  // 3. Fallbacks comuns por marca mesmo sem a palavra 'cartao' na planilha
  if (bNorm.includes('inter')) return "Inter Cartão";
  if (bNorm.includes('mercadopago') || bNorm.includes('mercado')) return "Mercado Pago Cartão";
  if (bNorm.includes('picpay')) return "PicPay Cartão";
  if (bNorm.includes('banese')) return "Banese Cartão";
  if (bNorm.includes('caixa') && !bNorm.includes('conta')) return "Caixa Cartão";

  return null;
};

export const getCartaoVisual = (cartaoName: string) => {
  for (const key of Object.keys(CARTAO_ESTILOS)) {
    if (normalizeStr(key) === normalizeStr(cartaoName) || normalizeStr(key).includes(normalizeStr(cartaoName)) || normalizeStr(cartaoName).includes(normalizeStr(key))) {
      return CARTAO_ESTILOS[key];
    }
  }
  const cleanName = cartaoName.replace(/cart[aã]o/gi, '').trim() || cartaoName;
  return {
    ...CARTAO_ESTILO_PADRAO,
    shortName: cleanName
  };
};

export const FOTOS_RESPONSAVEIS: Record<string, string> = {
  "Ahyslla Vascaina": "/avatars/ahyslla.jpg",
  "Marcos Andrade": "/avatars/marcos.jpg",
};
