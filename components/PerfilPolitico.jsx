import { useState } from 'react';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import Avatar from './Avatar';
import { pctDoTeto } from '../src/lib/cotas';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const brlExato = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const corVoto = (tipo) => {
  const x = (tipo || '').toLowerCase();
  if (x === 'sim') return { bg: '#E7F3EC', fg: t.cor.sim };
  if (x === 'não' || x === 'nao') return { bg: '#FBEAE7', fg: t.cor.nao };
  if (x === 'obstrução') return { bg: '#FCEFE0', fg: t.cor.alertaTexto };
  return { bg: '#EEEDE8', fg: t.cor.cinza };
};
const corCoerencia = (p) => (p >= 80 ? t.cor.sim : p >= 50 ? t.cor.ouro : t.cor.nao);

const dicionario = {
  'Publicidade e Marketing': 'Divulgação do mandato: redes, sites, impressos.',
  'Escritório e Apoio': 'Aluguel de sala, internet, telefone, correios no estado.',
  'Transporte e Mobilidade': 'Combustível, locação de veículos, táxi, pedágio.',
  'Viagens e Estadias': 'Passagens aéreas e hospedagem em missões oficiais.',
  'Serviços Técnicos': 'Consultorias, pesquisas e trabalhos especializados.',
  'Alimentação': 'Refeições do parlamentar em atividade.',
  'Segurança': 'Serviços de segurança para o mandato.',
  'Outros Operacionais': 'Demais despesas operacionais do mandato.',
};

const MES_LETRA = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pilula = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none', border: 'none' };

// Quebra de texto no canvas; retorna o y final
function wrapCanvas(ctx, text, x, y, maxW, lh) {
  const palavras = (text || '').split(' ');
  let linha = '', yy = y;
  for (const w of palavras) {
    const teste = linha ? linha + ' ' + w : w;
    if (ctx.measureText(teste).width > maxW && linha) { ctx.fillText(linha, x, yy); linha = w; yy += lh; }
    else linha = teste;
  }
  ctx.fillText(linha, x, yy);
  return yy;
}

export default function PerfilPolitico({ dados }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(null);
  const [modal, setModal] = useState(false);
  const [explicaCota, setExplicaCota] = useState(false);

  const { perfil, resumo_gastos, total_geral, n_notas, media_mensal, maior_categoria, lista_detalhada, votos = [], resumo_votos = {}, coerencia = null,
    serie_mensal = [], anos_disponiveis = [], ano_referencia, meses_com_gasto = 0 } = dados;

  const [anoSel, setAnoSel] = useState(ano_referencia);
  const dadosAno = serie_mensal.find((s) => s.ano === anoSel) || serie_mensal[0] || null;
  const maxMes = dadosAno ? Math.max(...dadosAno.meses.map((m) => m.valor), 1) : 1;
  const mediaAno = dadosAno && dadosAno.meses_com_gasto > 0 ? dadosAno.total / dadosAno.meses_com_gasto : 0;

  const ehEstadual = perfil.casa_legislativa === 'estadual' || (perfil.fonte_api || '').includes('alesp');
  const rotuloCota = ehEstadual ? 'cota (verba de gabinete) ?' : 'cota parlamentar ?';
  const fonteNome = ehEstadual ? 'ALESP' : (perfil.fonte_api || '').includes('senado') ? 'Senado Federal' : 'Câmara dos Deputados';
  // % do teto mensal da cota — federal (CEAP), senador (CEAPS) e estadual-SP (verba ALESP)
  const tetoInfo = pctDoTeto({ fonteApi: perfil.fonte_api, casa: perfil.casa_legislativa, uf: perfil.uf_sede }, media_mensal);
  const corBarra = t.cor.ouro; // cor neutra (sem semáforo verde/vermelho que sugere julgamento)

  const linkOficial = () => {
    const id = (perfil.id_externo_api || '').split('-').pop();
    if ((perfil.fonte_api || '').includes('camara')) return `https://www.camara.leg.br/deputados/${id}`;
    if ((perfil.fonte_api || '').includes('senado')) return `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`;
    if ((perfil.fonte_api || '').includes('alesp')) return `https://www.al.sp.gov.br/deputado/?matricula=${id}`;
    return '#';
  };

  const compartilhar = async () => {
    const resumo = `${perfil.nome_urna} (${perfil.partido_atual}-${perfil.uf_sede || 'BR'}) usou ${brl(total_geral)} da cota parlamentar em 2026${coerencia ? `, votando com o próprio partido em ${coerencia.percentual.toFixed(0)}% das vezes` : ''}. Confira na fonte oficial:`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: perfil.nome_urna, text: resumo, url }); } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${resumo} ${url}`);
      alert('Resumo copiado! Cole onde quiser.');
    }
  };

  const gerarCard = async () => {
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    const x = c.getContext('2d');
    x.fillStyle = '#23272E'; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = '#E8930C'; x.fillRect(0, 0, 1080, 18);

    x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = '700 30px Georgia, serif';
    x.fillText('DADOS OFICIAIS · 2026', 90, 150);

    const ini = (perfil.nome_urna || '?').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
    x.fillStyle = '#E8930C'; x.beginPath(); x.arc(170, 320, 80, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#23272E'; x.font = '700 64px Georgia, serif'; x.textAlign = 'center';
    x.fillText(ini, 170, 342); x.textAlign = 'left';

    x.fillStyle = '#fff'; x.font = '600 76px Georgia, serif';
    const yNome = wrapCanvas(x, perfil.nome_urna || '', 290, 300, 700, 84);
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = '400 38px Georgia, serif';
    x.fillText(`${perfil.partido_atual || ''} · ${perfil.uf_sede || 'BR'}`, 290, yNome + 20);

    x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = '600 34px Georgia, serif';
    x.fillText('USOU DA COTA PARLAMENTAR', 90, 580);
    x.fillStyle = '#E8930C'; x.font = '700 92px Georgia, serif';
    x.fillText(brl(total_geral), 90, 678);

    if (coerencia) {
      x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = '600 34px Georgia, serif';
      x.fillText('VOTOU COM O PRÓPRIO PARTIDO', 90, 800);
      x.fillStyle = '#fff'; x.font = '700 80px Georgia, serif';
      x.fillText(`${coerencia.percentual.toFixed(0)}% das vezes`, 90, 888);
    }

    x.fillStyle = 'rgba(255,255,255,0.5)'; x.font = '400 30px Georgia, serif';
    x.fillText(`Fonte: ${fonteNome} — confira você mesmo.`, 90, 1010);

    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const file = new File([blob], `${perfil.slug || 'politico'}.png`, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: perfil.nome_urna }); return; } catch (e) {}
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pagina">
      <button onClick={() => router.back()} style={{ ...pilula, background: '#fff', color: t.cor.tinta, marginBottom: '24px', boxShadow: t.sombra.clicavel }}>← Voltar</button>

      {/* CAMADA ZERO — veredito em português claro */}
      <div className="surgir" style={{ background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar nome={perfil.nome_urna} foto={perfil.foto_url} size={92} borda="3px solid rgba(255,255,255,0.3)" />
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.4rem)', margin: '0 0 2px' }}>{perfil.nome_urna}</h1>
            <p style={{ margin: 0, opacity: 0.85 }}>{perfil.cargo_atual || 'Deputado Federal'} · {perfil.partido_atual} · {perfil.uf_sede || 'BR'}</p>
          </div>
        </div>

        <p style={{ fontSize: '1.15rem', lineHeight: 1.6, margin: '24px 0 0', maxWidth: '62ch' }}>
          {n_notas > 0 ? (
            <>Em <strong>2026</strong>, {perfil.nome_urna} usou <strong style={{ color: t.cor.ouro }}>{brl(total_geral)}</strong> da verba pública de mandato
            {' '}— a <button onClick={() => setExplicaCota(!explicaCota)} style={{ background: 'none', border: 'none', color: t.cor.ouro, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline dotted' }}>{rotuloCota}</button> —
            {' '}em <strong>{n_notas}</strong> notas fiscais, cerca de <strong>{brl(media_mensal)} por mês</strong>{maior_categoria ? <>, com mais gasto em <strong>{maior_categoria}</strong></> : null}.</>
          ) : (
            <>Ainda estamos reunindo os gastos da <button onClick={() => setExplicaCota(!explicaCota)} style={{ background: 'none', border: 'none', color: t.cor.ouro, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline dotted' }}>{rotuloCota}</button> de {perfil.nome_urna} — em breve aqui.</>
          )}
          {coerencia ? <> Nas votações, acompanhou o próprio partido em <strong style={{ color: t.cor.ouro }}>{coerencia.percentual.toFixed(0)}%</strong> das vezes.</> : null}
        </p>
        {explicaCota && (
          <p style={{ margin: '12px 0 0', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', padding: '12px 14px', borderRadius: t.raio.sm, lineHeight: 1.5 }}>
            <strong>Cota parlamentar:</strong> uma verba mensal, paga com o seu imposto, para o parlamentar tocar o mandato — passagens, aluguel de escritório, combustível, divulgação. O <strong>teto muda conforme o estado</strong> (quem é de estado mais distante de Brasília recebe mais, por causa das passagens) e é <strong>diferente entre Câmara, Senado e as Assembleias estaduais</strong>. Por isso comparamos cada um dentro da própria casa.{' '}
            <a href="/entenda#cotas" style={{ color: t.cor.ouro, fontWeight: 700, textDecoration: 'underline' }}>Ver os valores e tetos por estado →</a>
          </p>
        )}

        {tetoInfo && n_notas > 0 && (
          <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: t.raio.md, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700 }}>Usou cerca de <span style={{ color: corBarra }}>{tetoInfo.pct}%</span> do teto da cota</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>teto {perfil.uf_sede}{tetoInfo.tipo ? ` · ${tetoInfo.tipo}` : ''}: {brl(tetoInfo.teto)}/mês</span>
            </div>
            <div style={{ height: '12px', background: 'rgba(255,255,255,0.18)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(tetoInfo.pct, 100)}%`, height: '100%', background: corBarra, borderRadius: '999px', transition: 'width .5s ease' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.82rem', opacity: 0.8 }}>
              Média de <strong>{brl(media_mensal)}/mês</strong> comparada ao teto mensal de referência do estado ({brl(tetoInfo.teto)}). O saldo não usado pode acumular ao longo do ano, então a média pode variar entre os meses. Tire suas próprias conclusões com base nos dados.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button onClick={compartilhar} style={{ ...pilula, background: t.cor.ouro, color: t.cor.tinta }}>↗ Compartilhar</button>
          <button onClick={gerarCard} style={{ ...pilula, background: 'rgba(255,255,255,0.12)', color: '#fff' }}>📷 Gerar card</button>
          <button onClick={() => setModal(true)} style={{ ...pilula, background: 'rgba(255,255,255,0.12)', color: '#fff' }}>🔗 Ver na fonte oficial</button>
        </div>
      </div>

      {/* DETALHE: gastos + votos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px' }}>

        {dadosAno && (
          <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: 0 }}>Gastos mês a mês</h2>
              {anos_disponiveis.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="tablist" aria-label="Ano">
                  {anos_disponiveis.map((a) => (
                    <button key={a} onClick={() => setAnoSel(a)} aria-selected={a === anoSel}
                      style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer', border: 'none', background: a === anoSel ? t.cor.verde : t.cor.papelQuente, color: a === anoSel ? '#fff' : t.cor.tinta, boxShadow: t.sombra.clicavel }}>{a}</button>
                  ))}
                </div>
              )}
            </div>
            <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 18px', lineHeight: 1.5 }}>
              Quanto {perfil.nome_urna} usou da verba em cada mês de <strong>{anoSel}</strong> — cada barra é a soma das notas fiscais daquele mês. Passe o mouse para ver o valor.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '170px', padding: '0 2px' }}>
              {dadosAno.meses.map((m) => {
                const h = Math.max(4, Math.round((m.valor / maxMes) * 150));
                return (
                  <div key={m.mes} title={`${MES_NOME[m.mes - 1]}/${anoSel}: ${brlExato(m.valor)}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', maxWidth: '34px', height: `${h}px`, background: m.valor > 0 ? t.cor.ouro : t.cor.papelQuente2, borderRadius: '6px 6px 0 0', transition: 'height .3s ease' }} />
                    <span style={{ fontSize: '0.62rem', color: t.cor.cinza, fontWeight: 700 }}>{MES_LETRA[m.mes - 1]}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '18px', background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem' }}><strong>Total {anoSel}:</strong> {brl(dadosAno.total)}</span>
                <span style={{ fontSize: '0.9rem' }}><strong>Média:</strong> {brl(mediaAno)}/mês</span>
                <span style={{ fontSize: '0.9rem', color: t.cor.cinza }}>{dadosAno.meses_com_gasto} {dadosAno.meses_com_gasto === 1 ? 'mês' : 'meses'} com gasto</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.5 }}>
                <strong style={{ color: t.cor.tinta }}>Como a média é calculada:</strong> somamos todas as notas de {anoSel} e dividimos pelo número de meses com gasto registrado ({dadosAno.meses_com_gasto}). Meses sem nota não entram na conta — por isso a média pode ficar acima do gasto de um mês isolado. Fonte: {fonteNome}.
              </p>
            </div>
          </div>
        )}

        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Em que ele gastou</h2>
          <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px' }}>Toque numa categoria para ver as notas e o link de cada documento.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(resumo_gastos).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, overflow: 'hidden', boxShadow: t.sombra.clicavel }}>
                <div onClick={() => setAberta(aberta === cat ? null : cat)} title={dicionario[cat] || ''} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700, color: t.cor.tinta, fontSize: '0.95rem' }}>{cat}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{brlExato(val)}</strong>
                    <span style={{ color: t.cor.cinza, fontSize: '12px' }}>{aberta === cat ? '▲' : '▼'}</span>
                  </span>
                </div>
                {aberta === cat && (
                  <div style={{ padding: '0 16px 12px', background: '#FFFFFF' }}>
                    <p style={{ fontSize: '0.8rem', color: t.cor.cinza, margin: '10px 0' }}>{dicionario[cat] || ''}</p>
                    {lista_detalhada.filter((g) => g.categoria_normalizada === cat).slice(0, 60).map((it, i) => (
                      <div key={i} style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ color: t.cor.tinta, fontSize: '0.86rem', fontWeight: 600 }}>
                            {it.data_emissao ? new Date(it.data_emissao).toLocaleDateString('pt-BR') : ''} · {it.fornecedor_nome || '—'}
                          </span>
                          <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            <strong style={{ fontSize: '0.88rem' }}>{brlExato(it.valor_liquido)}</strong>
                            {it.url_documento && <a href={it.url_documento} target="_blank" rel="noopener noreferrer" title="Documento oficial na fonte" style={{ textDecoration: 'none' }}>🔗</a>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.72rem', color: t.cor.cinza }}>
                          <span><strong style={{ color: t.cor.tinta }}>Tipo:</strong> {it.tipo_despesa || '—'}</span>
                          <span><strong style={{ color: t.cor.tinta }}>Período:</strong> {it.mes ? `${String(it.mes).padStart(2, '0')}/2026` : '—'}</span>
                          {it.id_externo_documento && <span><strong style={{ color: t.cor.tinta }}>Doc:</strong> {String(it.id_externo_documento).split('-')[0]}</span>}
                          {it.fornecedor_cnpj_cpf && <span><strong style={{ color: t.cor.tinta }}>CNPJ/CPF:</strong> {it.fornecedor_cnpj_cpf}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 16px' }}>Como ele votou</h2>

          {coerencia && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: t.cor.papelQuente, borderRadius: t.raio.md, marginBottom: '20px', boxShadow: t.sombra.sutil }}>
              <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '2.2rem', color: corCoerencia(coerencia.percentual) }}>{coerencia.percentual.toFixed(0)}%</span>
              <span style={{ fontSize: '0.9rem', color: t.cor.cinza, lineHeight: 1.45 }}>
                das vezes votou junto com a maioria do <strong style={{ color: t.cor.tinta }}>{coerencia.partido}</strong> ({coerencia.alinhados} de {coerencia.considerados} votações nominais).
              </span>
            </div>
          )}

          {votos.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {Object.entries(resumo_votos).map(([tipo, q]) => (
                  <span key={tipo} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: corVoto(tipo).bg, color: corVoto(tipo).fg }}>{tipo}: {q}</span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {votos.slice(0, 12).map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: t.cor.papelQuente, borderRadius: t.raio.md, boxShadow: t.sombra.sutil }}>
                    <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: corVoto(v.voto_tipo).bg, color: corVoto(v.voto_tipo).fg, minWidth: '54px', textAlign: 'center' }}>{v.voto_tipo}</span>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.88rem', lineHeight: 1.4 }}>{v.ementa_resumida_voto}</p>
                      <span style={{ fontSize: '0.72rem', color: t.cor.cinza }}>
                        {v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}
                        {typeof v.aprovacao === 'number' && (v.aprovacao === 1 ? ' · Aprovado' : ' · Rejeitado')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: t.cor.cinza, fontSize: '0.9rem' }}>Sem votos nominais no período coletado.</p>
          )}
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,26,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: t.raio.lg, padding: '28px', maxWidth: '420px', textAlign: 'center' }}>
            <h3 style={{ fontFamily: t.fonte.titulo, margin: '0 0 12px' }}>Você vai conferir na fonte</h3>
            <p style={{ color: t.cor.cinza, fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 22px' }}>
              Para garantir a transparência, você será levado ao portal oficial da <strong>{perfil.casa_legislativa || 'Câmara'}</strong> para auditar os dados na origem.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModal(false)} style={{ ...pilula, flex: 1, justifyContent: 'center', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.clicavel }}>Cancelar</button>
              <a href={linkOficial()} target="_blank" rel="noopener noreferrer" onClick={() => setModal(false)} style={{ ...pilula, flex: 1, justifyContent: 'center', background: t.cor.verde, color: '#fff' }}>Prosseguir →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
