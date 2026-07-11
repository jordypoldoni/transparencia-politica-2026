import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import Avatar from './Avatar';
import { pctDoTeto } from '../src/lib/cotas';
import { explicarTipo } from '../src/lib/votacao';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const brlExato = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const VOTOS_REAIS = new Set(['sim', 'não', 'nao', 'obstrução', 'abstenção', 'abstencao']);
const isVotoReal = (tipo) => VOTOS_REAIS.has((tipo || '').toLowerCase());

const corVoto = (tipo) => {
  const x = (tipo || '').toLowerCase();
  if (x === 'sim') return { bg: '#E7F3EC', fg: t.cor.sim };
  if (x === 'não' || x === 'nao') return { bg: '#FBEAE7', fg: t.cor.nao };
  if (x === 'obstrução') return { bg: '#FCEFE0', fg: t.cor.alertaTexto };
  if (x === 'abstenção' || x === 'abstencao') return { bg: '#F0EFE9', fg: t.cor.cinza };
  return { bg: '#EEEDE8', fg: t.cor.cinza };
};
const corCoerencia = (p) => (p >= 80 ? t.cor.sim : p >= 50 ? t.cor.ouro : t.cor.nao);

// Remove prefixo "Votação nominal do" e sufixos genéricos (Senado não tem ementa real)
function limparEmentaNominal(texto) {
  if (!texto) return texto;
  return texto
    .replace(/^Votação nominal d[ao]\s+/i, '')
    .replace(/,?\s*nos termos d[oa]s?\s+pareceres?\.?\s*$/i, '')
    .replace(/,?\s*nos termos d[oa]\s+parecer\.?\s*$/i, '')
    .trim();
}

// Extrai da string crua da API: ementa limpa + placar do plenário
function parsearVoto(texto) {
  if (!texto) return { ementa: '', sim: null, nao: null, abs: null };
  const mSim = texto.match(/Sim:\s*(\d+)/i);
  const mNao = texto.match(/N[ãa]o:\s*(\d+)/i);
  const mAbs = texto.match(/Absten[çc][ãa]o:\s*(\d+)/i);
  const ementa = texto
    .replace(/^(Aprovad[ao]|Rejeitad[ao]|Votad[ao]|Retirad[ao])\s+(a|o|em|por)\s+/i, '')
    .replace(/\.\s*Sim:\s*\d+[^]*\.?\s*$/i, '')
    .replace(/\s*Sim:\s*\d+[^]*\.?\s*$/i, '')
    .trim();
  return {
    ementa,
    sim: mSim ? parseInt(mSim[1]) : null,
    nao: mNao ? parseInt(mNao[1]) : null,
    abs: mAbs ? parseInt(mAbs[1]) : null,
  };
}

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

// Idade em anos cheios a partir da data de nascimento (YYYY-MM-DD)
function idadeDe(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

// Detecta a rede social pela URL (rótulo cidadão, sem depender de biblioteca de ícones)
function redeInfo(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('instagram')) return { nome: 'Instagram' };
  if (u.includes('facebook')) return { nome: 'Facebook' };
  if (u.includes('twitter') || u.includes('x.com')) return { nome: 'X (Twitter)' };
  if (u.includes('youtube')) return { nome: 'YouTube' };
  if (u.includes('tiktok')) return { nome: 'TikTok' };
  if (u.includes('linkedin')) return { nome: 'LinkedIn' };
  if (u.includes('flickr')) return { nome: 'Flickr' };
  return { nome: 'Site/rede' };
}

// Cartão de dado biográfico (rótulo + valor) — reutilizável
function DadoBio({ rotulo, valor }) {
  if (!valor) return null;
  return (
    <div style={{ minWidth: '140px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.cinza, marginBottom: '2px' }}>{rotulo}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: t.cor.tinta }}>{valor}</div>
    </div>
  );
}

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
  const [votoAberto, setVotoAberto] = useState(null);
  const [modal, setModal] = useState(false);
  const [explicaCota, setExplicaCota] = useState(false);
  const [bioAberta, setBioAberta] = useState(false);

  const { perfil, resumo_gastos, total_geral, n_notas, media_mensal, maior_categoria, lista_detalhada, votos = [], resumo_votos = {}, coerencia = null,
    serie_mensal = [], anos_disponiveis = [], ano_referencia, meses_com_gasto = 0, presenca = null } = dados;

  // Ficha 360°: dados biográficos e de atuação (podem estar vazios até o coletor rodar)
  const idade = idadeDe(perfil.data_nascimento);
  const naturalidade = [perfil.naturalidade_municipio, perfil.naturalidade_uf].filter(Boolean).join(' - ') || null;
  const redes = Array.isArray(perfil.redes_sociais) ? perfil.redes_sociais.filter(Boolean) : [];
  const comissoes = Array.isArray(perfil.comissoes) ? perfil.comissoes : [];
  const frentes = Array.isArray(perfil.frentes) ? perfil.frentes : [];
  // Só proposições com conteúdo exibível — evita "cards fantasma" se algum campo vier vazio.
  const proposicoes = (Array.isArray(perfil.proposicoes) ? perfil.proposicoes : []).filter((p) => p && (p.ementa || p.tipo || p.numero));
  const ocupacoes = Array.isArray(perfil.ocupacoes) ? perfil.ocupacoes : [];
  const cargosAnteriores = Array.isArray(perfil.cargos_anteriores) ? perfil.cargos_anteriores : [];
  const areasAtuacao = Array.isArray(perfil.areas_atuacao) ? perfil.areas_atuacao.filter(Boolean) : [];
  const filiacoes = Array.isArray(perfil.filiacoes) ? perfil.filiacoes : [];
  const contato = perfil.contato && typeof perfil.contato === 'object' ? perfil.contato : null;
  const telContato = contato && (contato.telefone || contato.predio || contato.sala) ? contato : null;
  const mandatoObj = perfil.mandato && typeof perfil.mandato === 'object' ? perfil.mandato : null;
  // Resumo do mandato em linguagem cidadã (varia por casa): "5º mandato · desde 2007" (ALESP) etc.
  const mandatoResumo = mandatoObj
    ? [
        mandatoObj.numero_mandatos ? `${mandatoObj.numero_mandatos}º mandato` : null,
        mandatoObj.desde ? `desde ${mandatoObj.desde}` : null,
      ].filter(Boolean).join(' · ') || null
    : null;
  const baseEleitoral = perfil.base_eleitoral || null;
  const biografiaTexto = perfil.biografia_texto || null;
  const temBio = !!(idade || naturalidade || perfil.escolaridade || perfil.profissao || perfil.email_oficial || redes.length || perfil.situacao || ocupacoes.length || cargosAnteriores.length || telContato || areasAtuacao.length || filiacoes.length || mandatoResumo || baseEleitoral || biografiaTexto);
  const temTrajetoria = ocupacoes.length > 0 || cargosAnteriores.length > 0 || filiacoes.length > 1;

  const [anoSel, setAnoSel] = useState(ano_referencia);
  const dadosAno = serie_mensal.find((s) => s.ano === anoSel) || serie_mensal[0] || null;
  const maxMes = dadosAno ? Math.max(...dadosAno.meses.map((m) => m.valor), 1) : 1;
  const mediaAno = dadosAno && dadosAno.meses_com_gasto > 0 ? dadosAno.total / dadosAno.meses_com_gasto : 0;

  // Navegação por seções (só lista as que existem para este parlamentar)
  // ATENÇÃO: precisa vir DEPOIS de `dadosAno` — referenciar antes causa TDZ ("Cannot access before initialization") no build de produção.
  const secoes = [
    { id: 'resumo', rotulo: 'Resumo' },
    temBio && { id: 'quem-e', rotulo: 'Quem é' },
    dadosAno && { id: 'gastos', rotulo: 'Gastos' },
    { id: 'atuacao', rotulo: 'Atuação' },
    temTrajetoria && { id: 'trajetoria', rotulo: 'Trajetória' },
    { id: 'proposicoes', rotulo: 'Proposições' },
    { id: 'votos', rotulo: 'Votos' },
  ].filter(Boolean);
  const ancora = { scrollMarginTop: '112px' }; // compensa header + barra fixa ao rolar até a âncora

  const ehEstadual = perfil.casa_legislativa === 'estadual' || (perfil.fonte_api || '').includes('alesp');
  const rotuloCota = ehEstadual ? 'cota (verba de gabinete) ?' : 'cota parlamentar ?';
  const fonteNome = ehEstadual ? 'ALESP' : (perfil.fonte_api || '').includes('senado') ? 'Senado Federal' : 'Câmara dos Deputados';
  // % do teto mensal da cota — federal (CEAP), senador (CEAPS) e estadual-SP (verba ALESP)
  const tetoInfo = pctDoTeto({ fonteApi: perfil.fonte_api, casa: perfil.casa_legislativa, uf: perfil.uf_sede }, mediaAno || media_mensal);
  // Valores do ANO SELECIONADO (reativo ao seletor de ano)
  const totalAno = dadosAno?.total ?? total_geral;
  const nNotasAno = dadosAno?.n_notas ?? n_notas;
  const maiorCatAno = dadosAno?.maior_categoria ?? maior_categoria;
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
      <style jsx global>{`html{scroll-behavior:smooth}`}</style>
      <button onClick={() => router.back()} style={{ ...pilula, background: '#fff', color: t.cor.tinta, marginBottom: '16px', boxShadow: t.sombra.clicavel }}>← Voltar</button>

      {/* Navegação por seções — fixa abaixo do cabeçalho */}
      <nav aria-label="Seções do perfil" style={{ position: 'sticky', top: '56px', zIndex: 40, marginBottom: '20px', padding: '8px', display: 'flex', gap: '8px', overflowX: 'auto', background: 'rgba(251,248,242,0.92)', backdropFilter: 'blur(8px)', borderRadius: t.raio.pill, boxShadow: t.sombra.clicavel }}>
        {secoes.map((s) => (
          <a key={s.id} href={`#${s.id}`} style={{ flexShrink: 0, fontSize: '0.82rem', fontWeight: 700, color: t.cor.tinta, textDecoration: 'none', padding: '7px 15px', borderRadius: t.raio.pill, background: t.cor.papelCartao, boxShadow: t.sombra.sutil }}>{s.rotulo}</a>
        ))}
      </nav>

      {/* CAMADA ZERO — veredito em português claro */}
      <div id="resumo" className="surgir" style={{ ...ancora, background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar nome={perfil.nome_urna} foto={perfil.foto_url} size={92} borda="3px solid rgba(255,255,255,0.3)" />
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.4rem)', margin: '0 0 2px' }}>{perfil.nome_urna}</h1>
            <p style={{ margin: 0, opacity: 0.85 }}>{perfil.cargo_atual || 'Deputado Federal'} · {perfil.partido_atual} · {perfil.uf_sede || 'BR'}</p>
          </div>
        </div>

        <p style={{ fontSize: '1.15rem', lineHeight: 1.6, margin: '24px 0 0', maxWidth: '62ch' }}>
          {nNotasAno > 0 ? (
            <>Em <strong>{anoSel}</strong>, {perfil.nome_urna} usou <strong style={{ color: t.cor.ouro }}>{brl(totalAno)}</strong> da verba pública de mandato
            {' '}— a <button onClick={() => setExplicaCota(!explicaCota)} style={{ background: 'none', border: 'none', color: t.cor.ouro, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline dotted' }}>{rotuloCota}</button> —
            {' '}em <strong>{nNotasAno}</strong> notas fiscais, cerca de <strong>{brl(mediaAno || media_mensal)} por mês</strong>{maiorCatAno ? <>, com mais gasto em <strong>{maiorCatAno}</strong></> : null}.</>
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

      {/* DETALHE: quem é + gastos + atuação + votos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px' }}>

        {/* QUEM É — cartão biográfico (Ficha 360°) */}
        <div id="quem-e" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Quem é</h2>
          {temBio ? (
            <>
              <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px' }}>
                Dados de identificação do parlamentar, direto do cadastro oficial da {fonteNome}.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px' }}>
                <DadoBio rotulo="Nome civil" valor={perfil.nome_completo && perfil.nome_completo !== perfil.nome_urna ? perfil.nome_completo : null} />
                <DadoBio rotulo="Idade" valor={idade ? `${idade} anos` : null} />
                <DadoBio rotulo="Natural de" valor={naturalidade} />
                <DadoBio rotulo="Escolaridade" valor={perfil.escolaridade} />
                <DadoBio rotulo="Profissão" valor={perfil.profissao} />
                <DadoBio rotulo="Situação no mandato" valor={perfil.situacao} />
                <DadoBio rotulo="Condição / cadeira" valor={perfil.condicao_eleitoral} />
                <DadoBio rotulo="Mandatos" valor={mandatoResumo} />
                <DadoBio rotulo="Base eleitoral" valor={baseEleitoral} />
              </div>

              {/* Contato do gabinete — fica DENTRO do site */}
              {telContato && (
                <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: `1px solid ${t.cor.papelQuente2}` }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.cinza, marginBottom: '8px' }}>Gabinete</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px', fontSize: '0.9rem', color: t.cor.tinta }}>
                    {telContato.telefone && <span><strong style={{ fontWeight: 600 }}>Telefone:</strong> {telContato.telefone}</span>}
                    {(telContato.predio || telContato.sala) && (
                      <span><strong style={{ fontWeight: 600 }}>Local:</strong> {[telContato.predio && `Prédio ${telContato.predio}`, telContato.andar && `${telContato.andar}º andar`, telContato.sala && `sala ${telContato.sala}`].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Ações de contato in-site: e-mail + redes reais (não levam embora sem valor) */}
              {(perfil.email_oficial || redes.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                  {perfil.email_oficial && (
                    <a href={`mailto:${perfil.email_oficial}`} style={{ ...pilula, background: t.cor.papelQuente, color: t.cor.tinta, boxShadow: t.sombra.clicavel, fontSize: '0.82rem', padding: '8px 14px' }}>✉ {perfil.email_oficial}</a>
                  )}
                  {redes.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ ...pilula, background: t.cor.papelQuente, color: t.cor.ouroTexto, boxShadow: t.sombra.clicavel, fontSize: '0.82rem', padding: '8px 14px' }}>{redeInfo(u).nome}</a>
                  ))}
                </div>
              )}

              {/* Nas palavras do gabinete — biografia auto-escrita, com ressalva honesta */}
              {biografiaTexto && (
                <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: `1px solid ${t.cor.papelQuente2}` }}>
                  <button onClick={() => setBioAberta(!bioAberta)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: t.fonte.corpo }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.cinza }}>Nas palavras do gabinete</span>
                    <span style={{ fontSize: '0.72rem', color: t.cor.cinza }}>{bioAberta ? '▲ ocultar' : '▼ ler'}</span>
                  </button>
                  {bioAberta && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: t.cor.cinza, fontStyle: 'italic', lineHeight: 1.5 }}>
                        Texto escrito pelo próprio gabinete do parlamentar. Reproduzimos como está, sem endossar nem revisar — os fatos acima vêm do cadastro oficial.
                      </p>
                      {biografiaTexto.split(/\n{2,}/).map((par, i) => (
                        <p key={i} style={{ margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.6, color: t.cor.tinta }}>{par}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Link discreto pra fonte — verificação, não chamada principal */}
              {perfil.website && (
                <div style={{ marginTop: '18px' }}>
                  <a href={perfil.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: t.cor.cinza, textDecoration: 'underline dotted' }}>ver ficha completa na fonte oficial →</a>
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Ainda estamos reunindo os dados de identificação deste parlamentar (nascimento, formação, profissão e contato). Em breve aqui — sempre a partir da fonte oficial.
            </p>
          )}
        </div>

        {dadosAno && (
          <div id="gastos" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: 0 }}>Gastos mês a mês</h2>
              {anos_disponiveis.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="tablist" aria-label="Ano">
                  {anos_disponiveis.map((a) => (
                    <button key={a} onClick={() => setAnoSel(a)} aria-selected={a === anoSel}
                      style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer', border: 'none', background: a === anoSel ? t.cor.verde : t.cor.papelQuente, color: a === anoSel ? t.cor.ouro : t.cor.tinta, boxShadow: t.sombra.clicavel }}>{a}</button>
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

        {/* ATUAÇÃO — comissões e frentes (Ficha 360°) */}
        <div id="atuacao" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Onde ele atua</h2>
          <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px', lineHeight: 1.5 }}>
            É nas <strong>comissões</strong> que os projetos são debatidos e votados antes do plenário; as <strong>frentes parlamentares</strong> são grupos temáticos que o parlamentar integra. Fonte: {fonteNome}.
          </p>

          {comissoes.length > 0 && (
            <div style={{ marginBottom: frentes.length > 0 ? '22px' : 0 }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Comissões que ocupa ({comissoes.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comissoes.slice(0, 12).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '12px 14px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: t.cor.tinta }}>
                      {c.nome || c.sigla}{c.sigla && c.nome ? <span style={{ color: t.cor.cinza, fontWeight: 400 }}> · {c.sigla}</span> : null}
                    </span>
                    {c.papel && <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: t.cor.ouroTexto }}>{c.papel}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {frentes.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Frentes parlamentares ({frentes.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {frentes.slice(0, 20).map((f, i) => (
                  <span key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: t.cor.tinta, background: t.cor.papelQuente, borderRadius: t.raio.pill, padding: '6px 14px' }}>{f.titulo}</span>
                ))}
                {frentes.length > 20 && <span style={{ fontSize: '0.8rem', color: t.cor.cinza, alignSelf: 'center' }}>+{frentes.length - 20}</span>}
              </div>
            </div>
          )}

          {/* Áreas de atuação (temas de trabalho declarados) */}
          {areasAtuacao.length > 0 && (
            <div style={{ marginTop: (comissoes.length > 0 || frentes.length > 0) ? '22px' : 0, paddingTop: (comissoes.length > 0 || frentes.length > 0) ? '18px' : 0, borderTop: (comissoes.length > 0 || frentes.length > 0) ? `1px solid ${t.cor.papelQuente2}` : 'none' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Áreas de atuação</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {areasAtuacao.slice(0, 14).map((a, i) => (
                  <span key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: t.cor.tinta, background: t.cor.papelQuente, borderRadius: t.raio.pill, padding: '6px 14px' }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {comissoes.length === 0 && frentes.length === 0 && areasAtuacao.length === 0 && (
            <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Ainda não reunimos as comissões e frentes deste parlamentar. Em breve aqui, a partir da fonte oficial.
            </p>
          )}
        </div>

        {/* TRAJETÓRIA — atuação profissional, cargos anteriores e partidos */}
        {temTrajetoria && (
          <div id="trajetoria" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Trajetória</h2>
            <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px', lineHeight: 1.5 }}>De onde veio: profissão, cargos eletivos anteriores e os partidos pelos quais passou. Fonte: {fonteNome}.</p>

            {ocupacoes.length > 0 && (
              <div style={{ marginBottom: (cargosAnteriores.length > 0 || filiacoes.length > 1) ? '22px' : 0 }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Atuação profissional</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ocupacoes.slice(0, 8).map((o, i) => (
                    <span key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: t.cor.tinta, background: t.cor.papelQuente, borderRadius: t.raio.pill, padding: '6px 14px' }}>
                      {o.titulo}{o.entidade ? <span style={{ color: t.cor.cinza, fontWeight: 400 }}> · {o.entidade}</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cargosAnteriores.length > 0 && (
              <div style={{ marginBottom: filiacoes.length > 1 ? '22px' : 0 }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Cargos que já ocupou</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cargosAnteriores.slice(0, 10).map((c, i) => (
                    <div key={i} style={{ fontSize: '0.88rem', color: t.cor.tinta }}>
                      <strong>{c.cargo}</strong>
                      {(c.municipio || c.uf) ? <span style={{ color: t.cor.cinza }}> — {[c.municipio, c.uf].filter(Boolean).join('/')}</span> : null}
                      {c.ano ? <span style={{ color: t.cor.cinza }}> · {c.ano}{c.partido ? ` (${c.partido})` : ''}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filiacoes.length > 1 && (
              <div>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' }}>Partidos ao longo da carreira</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filiacoes.slice(0, 8).map((f, i) => (
                    <div key={i} style={{ fontSize: '0.86rem', color: t.cor.tinta }}>
                      <strong>{f.sigla}</strong>
                      {f.inicio ? <span style={{ color: t.cor.cinza }}> — {String(f.inicio).slice(0, 4)}{f.fim ? ` a ${String(f.fim).slice(0, 4)}` : ' (atual)'}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROPOSIÇÕES — leis e projetos apresentados (Ficha 360°) */}
        <div id="proposicoes" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>O que ele propôs</h2>
          {proposicoes.length > 0 ? (
            <>
              <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 18px', lineHeight: 1.5 }}>
                Projetos de lei, emendas e outras propostas que {perfil.nome_urna} apresentou neste mandato
                {typeof perfil.n_proposicoes === 'number' ? <> — <strong style={{ color: t.cor.tinta }}>{perfil.n_proposicoes}</strong> no total{perfil.n_proposicoes > proposicoes.length ? ` (mostrando as ${proposicoes.length} mais recentes)` : ''}</> : null}. Propor não é o mesmo que aprovar. Fonte: {fonteNome}.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {proposicoes.map((p, i) => (
                  <div key={i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '12px 14px' }}>
                    {(p.tipo || p.numero || p.ano) && (
                      <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: t.cor.ouroTexto, marginBottom: '3px' }}>
                        {[p.tipo, p.numero].filter(Boolean).join(' ')}{p.ano ? `/${p.ano}` : ''}
                      </span>
                    )}
                    {p.ementa && <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45, color: t.cor.tinta }}>{p.ementa}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: '6px 0 0', color: t.cor.cinza, fontSize: '0.9rem', lineHeight: 1.5 }}>
              {perfil.n_proposicoes === 0
                ? `${perfil.nome_urna} não consta como autor de proposições neste mandato nos dados oficiais.`
                : 'Ainda estamos reunindo as proposições apresentadas por este parlamentar. Em breve aqui, a partir da fonte oficial.'}
            </p>
          )}
        </div>

        <div id="votos" style={{ ...ancora, background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 16px' }}>Como ele votou</h2>

          {presenca && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: t.cor.papelQuente, borderRadius: t.raio.md, marginBottom: '16px', boxShadow: t.sombra.sutil }}>
              <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '2.2rem', color: corCoerencia(presenca.percentual) }}>{presenca.percentual.toFixed(0)}%</span>
              <span style={{ fontSize: '0.9rem', color: t.cor.cinza, lineHeight: 1.45 }}>
                <strong style={{ color: t.cor.tinta }}>Presença nas votações.</strong> Registrou voto em <strong style={{ color: t.cor.tinta }}>{presenca.compareceu}</strong> das <strong style={{ color: t.cor.tinta }}>{presenca.total}</strong> votações nominais do período que coletamos. Ausências justificadas (licença, missão) também contam como não registrado.
              </span>
            </div>
          )}

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
              {/* Resumo por tipo — separa votos reais de ausências */}
              {(() => {
                const entradas = Object.entries(resumo_votos);
                const reais = entradas.filter(([tp]) => isVotoReal(tp));
                const totalAusencias = entradas.filter(([tp]) => !isVotoReal(tp)).reduce((s, [, q]) => s + q, 0);
                return (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {reais.map(([tipo, q]) => (
                      <span key={tipo} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: corVoto(tipo).bg, color: corVoto(tipo).fg }}>{tipo}: {q}</span>
                    ))}
                    {totalAusencias > 0 && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: '#EEEDE8', color: t.cor.cinza }}>Ausente: {totalAusencias}</span>
                    )}
                  </div>
                );
              })()}

              {/* Cards de votos com expansão */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {votos.filter((v) => isVotoReal(v.voto_tipo)).slice(0, 20).map((v, i) => {
                  const aberto = votoAberto === i;
                  const { ementa: ementaSubvoto, sim, nao, abs } = parsearVoto(v.ementa_resumida_voto);
                  // Pula ementa genérica tipo "Votação nominal do PLP X nos termos dos pareceres"
                  const ehEmentaGenerica = !v.ementa_votacao || /^Votação nominal/i.test(v.ementa_votacao);
                  const tituloBruto = (ehEmentaGenerica ? null : v.ementa_votacao)
                    || ementaSubvoto
                    || v.ementa_resumida_voto;
                  // Para senadores: limpa "Votação nominal do … nos termos dos pareceres" → só o identificador da proposta
                  const tituloPrincipal = /^Votação nominal/i.test(tituloBruto || '')
                    ? limparEmentaNominal(tituloBruto)
                    : tituloBruto;
                  const resultadoPlenario = typeof v.aprovacao === 'number'
                    ? (v.aprovacao === 1 ? 'Aprovado' : 'Rejeitado')
                    : (sim != null && nao != null ? (sim > nao ? 'Aprovado' : 'Rejeitado') : null);

                  return (
                    <div key={i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, overflow: 'hidden', boxShadow: t.sombra.sutil }}>
                      {/* Linha clicável */}
                      <div
                        onClick={() => setVotoAberto(aberto ? null : i)}
                        style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px', cursor: 'pointer' }}
                      >
                        {/* Badge Sim/Não */}
                        <span style={{
                          flexShrink: 0, fontSize: '0.85rem', fontWeight: 800,
                          padding: '6px 14px', borderRadius: '8px',
                          background: corVoto(v.voto_tipo).bg, color: corVoto(v.voto_tipo).fg,
                          minWidth: '62px', textAlign: 'center', lineHeight: 1.2,
                        }}>{v.voto_tipo}</span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Proposição identificadora */}
                          {v.proposicao_titulo && (
                            <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: t.cor.ouroTexto, marginBottom: '3px' }}>
                              {v.proposicao_titulo}
                            </span>
                          )}
                          {/* O que está sendo decidido */}
                          <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.45, color: t.cor.tinta }}>
                            {tituloPrincipal}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: t.cor.cinza }}>
                            {v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}
                            {resultadoPlenario && (
                              <> · <span style={{ color: resultadoPlenario === 'Aprovado' ? t.cor.sim : t.cor.nao, fontWeight: 600 }}>
                                {resultadoPlenario} no plenário
                              </span></>
                            )}
                          </span>
                        </div>

                        <span style={{ flexShrink: 0, fontSize: '0.75rem', color: t.cor.cinza, paddingTop: '4px' }}>{aberto ? '▲' : '▼'}</span>
                      </div>

                      {/* Painel expandido */}
                      {aberto && (
                        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${t.cor.papelQuente2}` }}>

                          {/* O que especificamente foi votado nesta sessão (só exibe se não for texto genérico "Votação nominal") */}
                          {ementaSubvoto && ementaSubvoto !== tituloPrincipal && !/^Votação nominal/i.test(ementaSubvoto) && (
                            <div style={{ margin: '14px 0 0', padding: '12px 14px', background: '#fff', borderRadius: t.raio.sm }}>
                              <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza }}>O que foi votado nesta sessão</p>
                              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: t.cor.tinta }}>{ementaSubvoto}</p>
                            </div>
                          )}

                          {/* Placar do plenário */}
                          {(sim != null || nao != null) && (
                            <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: t.cor.cinza }}>
                              Placar no plenário:{' '}
                              {sim != null && <><strong style={{ color: t.cor.sim }}>{sim} a favor</strong>{' '}</>}
                              {nao != null && <>· <strong style={{ color: t.cor.nao }}>{nao} contra</strong>{' '}</>}
                              {abs != null && <>· {abs} abstenções</>}
                            </p>
                          )}

                          {/* Botão para a página da votação — só exibe quando existe registro na tabela votacoes (senadores usam SF-XXXX que não têm página) */}
                          {v.votacao_id_externa && v.ementa_votacao && (
                            <div style={{ marginTop: '16px' }}>
                              <Link href={`/votacao/${v.votacao_id_externa}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                                  padding: '10px 20px', borderRadius: t.raio.pill,
                                  background: t.cor.verde, color: t.cor.ouro,
                                  fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
                                  boxShadow: t.sombra.clicavel,
                                }}>
                                Ver votação completa →
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ padding: '16px', background: t.cor.papelQuente, borderRadius: t.raio.md }}>
              {ehEstadual ? (
                <>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: t.cor.tinta, fontSize: '0.92rem' }}>Votações da ALESP ainda não disponíveis</p>
                  <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.86rem', lineHeight: 1.5 }}>
                    Ainda não coletamos as votações nominais da Assembleia Legislativa de SP automaticamente. Para consultar os votos, acesse o <a href="https://www.al.sp.gov.br/alesp/pesquisa-proposicoes/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 600 }}>portal da ALESP</a>.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.9rem' }}>Sem votos nominais no período coletado.</p>
              )}
            </div>
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
              <a href={linkOficial()} target="_blank" rel="noopener noreferrer" onClick={() => setModal(false)} style={{ ...pilula, flex: 1, justifyContent: 'center', background: t.cor.verde, color: t.cor.ouro }}>Prosseguir →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
