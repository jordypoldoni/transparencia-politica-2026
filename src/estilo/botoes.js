import { t } from './tokens';

// Botao de paginacao do site. Fonte UNICA: o par "Anterior / Proxima" existia escrito duas
// vezes, em /deputados e em /candidatos-2026, e com aparencias diferentes - um cinza claro e
// outro indigo com texto branco, um com setas e outro sem. Mesma funcao, duas caras.
//
// Regras das Diretrizes de Design aplicadas aqui: pilula, sem borda, indigo com texto ambar,
// sombra que cresce no hover e some no botao desativado (sombra e convite a clicar).
// Largura minima igual nos dois e centralizacao nos dois eixos, senao "Anterior" e "Proxima"
// geram capsulas de tamanhos diferentes e o texto parece descentralizado.
export const pilulaPagina = (desativado) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '124px', lineHeight: 1, textAlign: 'center',
  padding: '12px 20px', fontSize: '0.86rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: desativado ? 'default' : 'pointer',
  border: 'none', background: t.cor.verde, color: t.cor.ouro,
  boxShadow: desativado ? 'none' : t.sombra.clicavel,
  opacity: desativado ? 0.35 : 1,
  transition: 'box-shadow .15s ease, transform .15s ease',
});

export const realcePagina = (e, ligar) => {
  if (e.currentTarget.disabled) return;
  e.currentTarget.style.boxShadow = ligar ? t.sombra.hover : t.sombra.clicavel;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};
