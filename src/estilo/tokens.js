// Tokens de design — fonte única de estilo do site (identidade própria).
export const t = {
  cor: {
    tinta: '#191C20',        // texto principal (quase preto)
    papel: '#F7F6F3',        // fundo (off-white neutro)
    papelCartao: '#FFFFFF',  // cartões
    // Direção: GRAFITE dominante + ÂMBAR vivo de acento (não-pastel, memorável)
    verde: '#23272E',        // [primária] grafite — botões/estrutura
    verdeEscuro: '#13161A',  // grafite escuro
    ouro: '#E8930C',         // [acento vivo] âmbar — fills, ícones, bordas, texto sobre fundo ESCURO
    ouroTexto: '#9A5B00',    // âmbar escuro p/ TEXTO sobre fundo claro (contraste >= 4.5:1, WCAG)
    cinza: '#6B7280',        // texto secundário
    linha: '#E6E3DC',        // (legado) — NÃO usar como borda de container; só divisores muito sutis se preciso
    papelQuente: '#FAF5EE',  // tom quente p/ separar superfícies internas sem borda
    papelQuente2: '#F4ECE1', // tom quente um pouco mais forte (hover/seleção)
    sim: '#1F7A4D',          // voto Sim
    nao: '#C0392B',          // voto Não
    alertaBg: '#FCEFE0',
    alertaTexto: '#9A4A1E',
  },
  fonte: {
    titulo: '"Fraunces", Georgia, serif',
    corpo: '"Public Sans", system-ui, -apple-system, sans-serif',
  },
  raio: { sm: '10px', md: '16px', lg: '24px', pill: '999px' },
  // Sombras com tom QUENTE (âmbar-marrom) — diferenciação sem bordas coloridas
  sombra: {
    sutil: '0 1px 2px rgba(74,52,30,0.06), 0 4px 16px rgba(74,52,30,0.05)',
    media: '0 8px 30px rgba(74,52,30,0.12)',
    clicavel: '0 1px 2px rgba(74,52,30,0.05), 0 2px 10px rgba(74,52,30,0.07)',
    hover: '0 12px 30px rgba(74,52,30,0.16)',
    anelFoco: '0 0 0 3px rgba(232,147,12,0.28)', // anel âmbar p/ foco/ativo (no lugar de borda)
  },
  larguraMax: '1080px',
};
