import { useState, useMemo } from 'react';
import { t } from '../src/estilo/tokens';
import { pilulaPagina, realcePagina } from '../src/estilo/botoes';
import { dataBr } from '../src/lib/datas';

// NOTAS DE UMA CATEGORIA, SEPARADAS POR TIPO DE DESPESA (29/09/2026).
//
// O QUE ESTAVA ERRADO (achado do Jordy no perfil do Bibo Nunes, 2026): "Transporte e Mobilidade"
// dizia R$ 197.924,81 e a lista embaixo só tinha abastecimentos de R$ 200. O total estava certo
// (conferido no banco, centavo por centavo); a lista é que enganava, por três motivos:
//   1. mostrava as 60 primeiras notas e CORTAVA O RESTO SEM AVISAR (eram 290);
//   2. a ordem era a de data, não a de valor, então as 250 notas de combustível ocupavam as 60
//      vagas e as 23 de locação de veículo (R$ 128 mil, dois terços do total) nem apareciam;
//   3. três tipos de despesa vinham misturados, e a categoria parecia ser só combustível.
//
// AGORA: um bloco por tipo de despesa, do maior subtotal para o menor, cada um dizendo quanto
// soma e em quantas notas. Dentro do bloco, as notas vão da maior para a menor, e a tela diz
// "mostrando X de Y" com botão para ver mais. Nenhuma nota some; só a ordem e o agrupamento mudam.
// A linha "Tipo:" de cada nota saiu porque o tipo agora é o título do bloco (repetia a mesma
// informação).

const brlExato = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
// Data das notas: src/lib/datas.js (a coluna é `date`; new Date() mostrava um dia antes).
const INICIAIS = 5;   // notas visíveis por tipo ao abrir a categoria
const PASSO = 20;     // quantas a mais a cada clique

function Nota({ it, anoSel }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ color: t.cor.tinta, fontSize: '0.86rem', fontWeight: 600 }}>
          {dataBr(it.data_emissao)} · {it.fornecedor_nome || '-'}
        </span>
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <strong style={{ fontSize: '0.88rem' }}>{brlExato(it.valor_liquido)}</strong>
          {it.url_documento && <a href={it.url_documento} target="_blank" rel="noopener noreferrer" title="Documento oficial na fonte" style={{ textDecoration: 'none' }}>🔗</a>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.72rem', color: t.cor.cinza }}>
        <span><strong style={{ color: t.cor.tinta }}>Período:</strong> {it.mes ? `${String(it.mes).padStart(2, '0')}/${it.ano || anoSel}` : '-'}</span>
        {it.id_externo_documento && <span><strong style={{ color: t.cor.tinta }}>Doc:</strong> {String(it.id_externo_documento).split('-')[0]}</span>}
        {it.fornecedor_cnpj_cpf && <span><strong style={{ color: t.cor.tinta }}>CNPJ/CPF:</strong> {it.fornecedor_cnpj_cpf}</span>}
      </div>
    </div>
  );
}

function BlocoDoTipo({ tipo, notas, subtotal, anoSel, palavraNota, sozinho }) {
  const [visiveis, setVisiveis] = useState(INICIAIS);
  const mostradas = notas.slice(0, visiveis);
  const faltam = notas.length - mostradas.length;
  const plural = (n) => `${n.toLocaleString('pt-BR')} ${n === 1 ? palavraNota : `${palavraNota}s`}`;
  return (
    // Separação entre tipos por espaço, não por linha (Diretrizes: separação sem borda).
    <div style={{ padding: sozinho ? '10px 0 6px' : '22px 0 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: t.cor.tinta, minWidth: 0 }}>{tipo}</span>
        <span style={{ fontSize: '0.82rem', color: t.cor.cinza, flexShrink: 0 }}>
          <strong style={{ color: t.cor.tinta, fontSize: '0.9rem' }}>{brlExato(subtotal)}</strong> em {plural(notas.length)}
        </span>
      </div>
      {mostradas.map((it, i) => <Nota key={i} it={it} anoSel={anoSel} />)}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
        <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>
          Mostrando {mostradas.length} de {plural(notas.length)}, da maior para a menor.
        </span>
        {faltam > 0 && (
          <button type="button" onClick={() => setVisiveis((v) => v + PASSO)}
            style={{ ...pilulaPagina(false), minWidth: 0, padding: '9px 16px', fontSize: '0.8rem' }}
            onMouseOver={(e) => realcePagina(e, true)} onMouseOut={(e) => realcePagina(e, false)}>
            {faltam <= PASSO ? `Ver as últimas ${faltam}` : `Ver mais ${PASSO}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotasDaCategoria({ notas, anoSel, temNotaFiscal = true }) {
  const palavraNota = temNotaFiscal ? 'nota' : 'lançamento';
  const grupos = useMemo(() => {
    const porTipo = new Map();
    for (const it of notas || []) {
      const tipo = String(it.tipo_despesa || '').trim().replace(/\.$/, '') || 'Tipo não informado pela fonte';
      if (!porTipo.has(tipo)) porTipo.set(tipo, { tipo, notas: [], subtotal: 0 });
      const g = porTipo.get(tipo);
      g.notas.push(it);
      g.subtotal += parseFloat(it.valor_liquido || 0);
    }
    const lista = [...porTipo.values()];
    for (const g of lista) g.notas.sort((a, b) => parseFloat(b.valor_liquido || 0) - parseFloat(a.valor_liquido || 0));
    return lista.sort((a, b) => b.subtotal - a.subtotal);
  }, [notas]);

  if (!grupos.length) return null;
  return (
    <div>
      {grupos.map((g, i) => (
        <BlocoDoTipo key={g.tipo} tipo={g.tipo} notas={g.notas} subtotal={g.subtotal} anoSel={anoSel}
          palavraNota={palavraNota} sozinho={i === 0} />
      ))}
    </div>
  );
}
