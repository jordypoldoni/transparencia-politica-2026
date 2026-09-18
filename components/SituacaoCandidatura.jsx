import { t } from '../src/estilo/tokens';

// Seção "Situação da candidatura" da ficha do presidenciável. (16/09/2026)
//
// POR QUE É SEÇÃO PRÓPRIA E NÃO MAIS UMA LINHA EM "QUEM É"
// "Quem é" é identidade: nome, idade, naturalidade, escolaridade. Situação é status jurídico,
// muda até a eleição e pode carregar motivos de indeferimento. Misturar as duas põe coisas de
// naturezas diferentes com o mesmo peso, que é o erro que as Diretrizes de Design nomeiam.
//
// "Pendente de julgamento" vira deferido ou indeferido a qualquer momento até 04/10, então o
// dado precisa ser recente — e a tela diz QUANDO foi coletado, para o leitor julgar.//
// DO BANCO, NÃO MAIS AO VIVO (18/09/2026). O Akamai do TSE recusa a Vercel com 403 — a função
// declarou `regiao: iad1` e o corpo do erro é a página de negação dele. Não é ajustável pelo
// código. Mas a troca vale por si: buscando no navegador depois do carregamento, nada disto
// existia para o Google; vindo do banco, entra no HTML e vira conteúdo indexável. O preço é o
// frescor, e por isso a coleta precisa ser diária até 04/10.
//
// REGRA DE NEUTRALIDADE APLICADA AQUI: usamos o termo do TSE sem traduzir e sem adjetivo.
// "Indeferido" não vira "rejeitado" nem "barrado" - a tradução sugeriria uma definitividade que
// o dado não tem, tanto que o próprio TSE segue listando o candidato como "Concorrendo". Os
// motivos são transcritos como a fonte os publica, sem resumo nosso, com link para conferir.
export default function SituacaoCandidatura({ ficha }) {
  // Tradução dos nomes do banco para os que o JSX abaixo já usava. Mantida como camada fina
  // de propósito: o desenho e as decisões editoriais desta seção não mudaram, só a origem.
  const f = ficha || {};
  const d = {
    situacao: f.situacao_tse || null,
    constaDaUrna: f.consta_da_urna || null,
    totalizacao: f.totalizacao_tse || null,
    motivos: Array.isArray(f.motivos) ? f.motivos : [],
    substituido: !!f.substituido,
    substitutoNome: f.substituto_nome || null,
    parceiro: (Array.isArray(f.vices) && f.vices[0]) || null,
    numeroProcesso: f.numero_processo || null,
    consultadoEm: f.ficha_coletada_em || null,
    fonteUrl: f.ficha_fonte_url || null,
  };

  // Sem dado, sem seção. Ausência da fonte não vira caixa de erro numa informação acessória.
  if (!d.situacao) return null;

  const deferido = /^deferido$/i.test(String(d.situacao).trim());
  const data = d.consultadoEm ? new Date(d.consultadoEm).toLocaleDateString('pt-BR') : null;
  const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza };

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '24px', boxShadow: t.sombra.sutil }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 14px' }}>Situação da candidatura</h2>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: d.motivos?.length || d.substituido || d.parceiro?.apto === false ? '14px' : 0 }}>
        <span style={{
          fontSize: '0.8rem', fontWeight: 800, padding: '5px 12px', borderRadius: '6px',
          background: deferido ? '#E7F3EC' : t.cor.alertaBg,
          color: deferido ? t.cor.sim : t.cor.alertaTexto,
        }}>{d.situacao}</span>
        {d.constaDaUrna && <span style={{ fontSize: '0.84rem', color: t.cor.tinta }}>{d.constaDaUrna}</span>}
        {d.totalizacao && <span style={{ fontSize: '0.84rem', color: t.cor.cinza }}>· {d.totalizacao}</span>}
      </div>

      {/* Motivos: só existem em candidatura indeferida. Transcritos, não resumidos. */}
      {d.motivos?.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>Motivos registrados pelo TSE</p>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.6, color: t.cor.tinta }}>
            {d.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* A resposta ao enigma dos dois candidatos com o mesmo número: o TSE publica quem
          substituiu quem. Aqui não há dedução nossa. */}
      {d.substituido && d.substitutoNome && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>Substituição</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', lineHeight: 1.55, color: t.cor.tinta }}>
            Esta candidatura foi substituída por <strong style={{ fontWeight: 700 }}>{d.substitutoNome}</strong>, conforme registro do TSE.
          </p>
        </div>
      )}

      {/* O parceiro de chapa JÁ aparece como link no topo da página, então repeti-lo aqui
          seria ruído. O que não está lá e é material: quando o TSE marca o parceiro como
          INAPTO. Mesma regra do selo na listagem — o que informa é a exceção, não o normal.

          Até 18/09 este bloco dizia "o TSE publica os vices por número de urna e não informa
          qual integra cada chapa". Era falso: a ficha de cada candidato traz o parceiro dele,
          e os 28 pares são recíprocos e de cargos opostos. Afirmar que um dado público não
          existe é o pior erro que um site de transparência pode cometer, porque desencoraja
          quem procuraria. */}
      {d.parceiro?.apto === false && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>Parceiro de chapa</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', lineHeight: 1.55, color: t.cor.tinta }}>
            <strong style={{ fontWeight: 700 }}>{d.parceiro.nome}</strong> consta como <strong style={{ fontWeight: 700 }}>inapto</strong> no registro do TSE.
          </p>
        </div>
      )}

      <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: t.cor.cinza }}>
        Dado do TSE{data ? `, coletado em ${data}` : ''}
        {d.numeroProcesso ? ` · processo ${d.numeroProcesso}` : ''}
        {' · '}
        <a href={d.fonteUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>ver no DivulgaCandContas</a>
      </p>
    </section>
  );
}
