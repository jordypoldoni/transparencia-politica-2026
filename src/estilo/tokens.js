// Tokens de design — fonte única de estilo do site (identidade própria).
export const t = {
  cor: {
    tinta: '#191C20',        // texto principal (quase preto)
    papel: '#F7F6F3',        // fundo (off-white neutro)
    papelCartao: '#FFFFFF',  // cartões
    // Direção: ÍNDIGO dominante + ÂMBAR vivo de acento (não-pastel, memorável, sem cor de partido)
    verde: '#241E52',        // [primária] índigo profundo — botões/estrutura
    verdeEscuro: '#171238',  // índigo escuro
    ouro: '#FF8A00',         // [acento vivo] âmbar — fills, ícones, bordas, texto sobre fundo ESCURO
    ouroTexto: '#A85B00',    // âmbar escuro p/ TEXTO sobre fundo claro (contraste >= 4.5:1, WCAG)
    cinza: '#666E7B',        // texto secundário — era #6B7280 (4,47:1 sobre o papel, 0,03 abaixo do AA); este dá 4,76:1
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
    // BOTÕES (26/09/2026): sombra própria, visível. A `clicavel` (0,05/0,07) sumia embaixo dos
    // botões; o Jordy exigiu sombreamento padrão e elegante em TODO botão clicável. Duas camadas
    // em tom índigo: uma curta que assenta o botão, uma difusa que o levanta. `clicavel` segue
    // só para cartões e campos.
    botao: '0 1px 2px rgba(36,30,82,0.14), 0 4px 12px rgba(36,30,82,0.16)',
    botaoHover: '0 2px 4px rgba(36,30,82,0.14), 0 10px 24px rgba(36,30,82,0.22)',
    anelFoco: '0 0 0 3px rgba(255,138,0,0.28)', // anel âmbar p/ foco/ativo (no lugar de borda)
  },
  larguraMax: '1080px',
};
