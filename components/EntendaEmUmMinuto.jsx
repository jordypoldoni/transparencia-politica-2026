import ReportarErro from './ReportarErro';
import { dataBr } from '../src/lib/datas';

// Bloco "Entenda em 1 minuto" da página de uma votação (desenho aprovado pelo Jordy em 07/11/2026).
// Recebe o resultado de normalizarEntenda(); cada parte é opcional e some sozinha se faltar.
// Estilo em pages/_app.js (classes .entenda-*), para a grade virar coluna única no celular.
export default function EntendaEmUmMinuto({ dados, assunto }) {
  if (!dados) return null;
  const { mudancas, barras, dias, fluxo, excecoes, fontes, consultadoEm } = dados;
  return (
    <section className="entenda-sec" aria-labelledby="entenda-titulo">
      <h2 id="entenda-titulo">Entenda em 1 minuto</h2>
      <p className="entenda-sub">
        Resumo escrito por inteligência artificial a partir do texto oficial, com os dados conferidos nas fontes abaixo. Descreve o que o texto faz, sem opinar.
        {' '}Achou um erro? <ReportarErro assunto={`Resumo: ${String(assunto || 'votação').slice(0, 80)}`} />
      </p>
      <div className="entenda-grade">
        {mudancas.length > 0 && (
          <div className="entenda-cartao">
            <h3>O que muda na prática</h3>
            <ul className="entenda-lista">
              {mudancas.map((m, i) => (<li key={i}><span className="entenda-n" aria-hidden="true">{i + 1}</span><span>{m}</span></li>))}
            </ul>
          </div>
        )}
        {(barras || dias) && (
          <div className="entenda-cartao">
            <h3>Em números</h3>
            {barras && (
              <>
                {barras.titulo && <p className="entenda-rotulo">{barras.titulo}</p>}
                <div className="entenda-barras">
                  {barras.itens.map((b, i) => (
                    <div className="entenda-linha" key={i}>
                      <div>{b.rotulo}{b.sub && <small>{b.sub}</small>}</div>
                      <div className="entenda-trilho"><div className={`entenda-barra${b.destaque ? ' am' : ''}`} style={{ width: `${b.largura}%` }}>{b.valor}{b.unidade ? ` ${b.unidade}` : ''}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {dias && (
              <>
                {dias.titulo && <p className="entenda-rotulo">{dias.titulo}</p>}
                <div className="entenda-semana">
                  {dias.linhas.map((l, i) => (
                    <div className="entenda-dias" key={i}>
                      {Array.from({ length: l.trabalho }).map((_, k) => (<span key={`t${k}`} className="entenda-dia" />))}
                      {Array.from({ length: l.descanso }).map((_, k) => (<span key={`d${k}`} className="entenda-dia d" />))}
                      <span className="entenda-leg">{l.rotulo}</span>
                    </div>
                  ))}
                </div>
                <p className="entenda-nota">Azul: dia de trabalho. Âmbar: dia de descanso.</p>
              </>
            )}
          </div>
        )}
        {fluxo && (
          <div className="entenda-cartao entenda-cheio">
            <h3>Por onde a proposta passou</h3>
            <div className="entenda-fluxo" style={{ gridTemplateColumns: Array.from({ length: fluxo.etapas.length * 2 - 1 }).map((_, i) => (i % 2 ? 'auto' : '1fr')).join(' ') }}>
              {fluxo.etapas.map((e, i) => (
                <span key={i} style={{ display: 'contents' }}>
                  {i > 0 && <div className="entenda-seta" aria-hidden="true">→</div>}
                  <div className={`entenda-etapa${e.final ? ' fim' : ''}`}><b>{e.titulo}</b>{e.texto && <span>{e.texto}</span>}</div>
                </span>
              ))}
            </div>
            {fluxo.nota && <p className="entenda-regra">{fluxo.nota}</p>}
          </div>
        )}
        {excecoes.length > 0 && (
          <div className="entenda-cartao entenda-cheio">
            <h3>Exceções e detalhes</h3>
            <ul className="entenda-exc">{excecoes.map((e, i) => (<li key={i}>{e}</li>))}</ul>
          </div>
        )}
      </div>
      {(fontes.length > 0 || consultadoEm) && (
        <p className="entenda-fonte">
          Fontes: {fontes.map((f, i) => (<span key={i}>{i > 0 ? ', ' : ''}{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.rotulo}</a> : f.rotulo}</span>))}
          {consultadoEm ? ` (consultadas em ${dataBr(consultadoEm)})` : ''}.
        </p>
      )}
    </section>
  );
}
