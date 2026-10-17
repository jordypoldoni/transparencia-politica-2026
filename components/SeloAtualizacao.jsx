import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { dataBr } from '../src/lib/datas';
import { formatarDadosAte } from '../src/lib/datasFonte';

// Selo de data da fonte (T10 / D-036): diz ao leitor quando coletamos e ate quando a fonte ja
// publicou. E INFORMACAO, nao botao: texto simples, sem fundo e sem capsula (Diretrizes de Design,
// regra de 17/10/2026). So o link "Como atualizamos" e clicavel, e por isso e o unico em ouroTexto.
//
// Uma resposta so (/api/fonte-status) serve todos os selos da pagina: a promessa fica no modulo.
// Sem linha para a fonte (coletor ainda nao rodou, API fora): o selo some, nao inventa data.
let promessa = null;
function carregar() {
  if (!promessa) {
    promessa = fetch('/api/fonte-status')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => { promessa = null; return []; });
  }
  return promessa;
}

// fonte/escopo/mensal: ver src/lib/selosFonte.js.
// tipo: 'dados' ("Dados até X · coletado em Y"), 'ficha' ("Ficha atualizada em Y") ou
//       'coleta' ("Coletado em Y").
// nome: prefixo quando a tela junta varias fontes ("Câmara dos Deputados: dados até ...").
// coletadoEm: data ja em maos (ex.: coluna da propria linha da tela); dispensa a busca.
// semLink: tira o "Como atualizamos" quando varios selos ficam juntos (so o ultimo leva o link).
// escuro: para cartao indigo (texto branco translucido e link em ouro; ouroTexto nao le sobre indigo).
// aoVivo: sem tabela, a tela consulta a fonte oficial no momento da visita.
export default function SeloAtualizacao({ fonte, escopo = '', mensal = false, tipo = 'dados', aoVivo = false, rotulo = null, nome = null, coletadoEm = null, semLink = false, escuro = false, style }) {
  const [linha, setLinha] = useState(null);
  useEffect(() => {
    if (aoVivo || !fonte || coletadoEm) return undefined;
    let vivo = true;
    carregar().then((l) => { if (vivo) setLinha((l || []).find((x) => x.fonte === fonte && (x.escopo || '') === escopo) || null); });
    return () => { vivo = false; };
  }, [fonte, escopo, aoVivo, coletadoEm]);

  let texto = null;
  if (aoVivo) texto = rotulo || 'Consulta feita ao vivo na fonte oficial, no momento em que você abre a página.';
  else if (coletadoEm || linha?.coletado_em) {
    const coleta = dataBr(coletadoEm || linha.coletado_em);
    const ate = coletadoEm ? null : formatarDadosAte(linha.dados_ate, mensal);
    if (tipo === 'ficha') texto = `${rotulo || 'Ficha atualizada em'} ${coleta}`;
    else if (tipo === 'dados' && ate) texto = `${rotulo || 'Dados até'} ${ate} · coletado em ${coleta}`;
    else texto = `${rotulo || 'Coletado em'} ${coleta}`;
  }
  if (!texto) return null;
  if (nome) texto = `${nome}: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;

  return (
    <p style={{ margin: '0 0 14px', fontSize: '0.8rem', lineHeight: 1.5, color: escuro ? 'rgba(255,255,255,0.78)' : t.cor.cinza, ...style }}>
      {texto}
      {!semLink && <>{' · '}<Link href="/entenda#atualizacao" style={{ color: escuro ? t.cor.ouro : t.cor.ouroTexto, fontWeight: 600 }}>Como atualizamos</Link></>}
    </p>
  );
}
