// APURAÇÃO ao vivo. GET /api/apuracao?cargo=governador&uf=RS[&limite=30][&turno=2]  (02/10/2026)
//
// Lê o arquivo oficial do TSE, reduz (src/lib/apuracaoTse.js) e entrega com cache na borda da
// Vercel: o TSE é consultado, no máximo, uma vez a cada 10 s (apuração em andamento) ou 30 s (ainda não
// começou ou já em 100%) por cargo e estado, não uma vez por
// visitante. Nada vai ao banco. cargo: presidente | governador | senador | deputado-federal |
// deputado-estadual. Presidente não leva uf. turno: 1 (padrão) ou 2; o 2º turno só existe para
// presidente e governador de AC, AM, DF, ES, RN e TO (regras em src/lib/turnos.js).
//
// Arquivo ainda não publicado (404 do TSE): resposta 404 `tse_nao_publicou`, sem insistir por 60 s.
// Se a Vercel for recusada pelo TSE (o DivulgaCandContas recusa com 403), a resposta diz
// `tse_recusou` com o status: é assim que descobrimos, e o plano B é a tse-ponte do Supabase.
import { urlDoResultado, reduzirResultado } from '../../src/lib/apuracaoTse';
import { combinarComSoma, modoDaSoma, anomaliaNacional, carimbo } from '../../src/lib/somaEstados';
import { carregarParaSoma } from '../../src/lib/somaEstadosRede';

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const emVoo = new Map(); // url -> Promise: visitantes simultâneos no mesmo servidor dividem 1 pedido
const recente = new Map(); // url -> { em, corpo }
// 404 do TSE = arquivo ainda não publicado (ex.: um estado do 2º turno antes da zerésima). Lembrado por 60 s
// para não repetir o pedido: 404 em excesso bloqueia o IP por 10 minutos.
const NAO_PUBLICADO_MS = 60000;

// Tempo de cache em segundos (12/10/2026, pedido do Jordy): 10 s enquanto há seções sendo apuradas
// (0 < totalizadas < total), 30 s quando ainda não começou ou já chegou a 100%. A tela usa a mesma regra.
const emAndamento = (corpo) => { const s = corpo.secoes || {}; return s.totalizadas > 0 && s.totalizadas < s.total; };
const segundosDeCache = (corpo) => (emAndamento(corpo) ? 10 : 30);
const cabecalhoDeCache = (corpo) => { const n = segundosDeCache(corpo); return `public, s-maxage=${n}, stale-while-revalidate=${n * 2}`; };
const naoPublicado = new Map(); // url -> instante do último 404

// TOTAL NACIONAL PELA SOMA DOS ESTADOS (18/10/2026, I4, D-049). Só presidente. O arquivo NACIONAL continua sendo a base
// e a reserva: a soma só substitui quando está à frente E passa em todas as verificações (src/lib/somaEstados.js).
// Interruptor (variável de ambiente APURACAO_SOMA_ESTADOS na Vercel): auto (padrão quando ausente: sombra até 23/10 09h,
// on depois) | off (botão de emergência) | sombra (calcula e registra no log, mas entrega o nacional) | on (entrega a soma
// quando válida e à frente). `?origem=nacional` força o nacional e `?origem=soma` força a tentativa da soma (diagnóstico;
// só vale com o interruptor em sombra ou on). Autoauditoria: ver anomaliaNacional() em src/lib/somaEstados.js.
const SOMA_PAUSA_MS = 60000; // disjuntor: após 3 falhas seguidas, não tenta por 60 s
const SOMA_PAUSA_ANOMALIA_MS = 15 * 60000; // autoauditoria: anomalia desliga a soma por 15 min
const somaEstado = { falhas: 0, pausadoAte: 0, entregue: null }; // entregue = { total, carimbo } da última soma mostrada (por instância)

async function buscarRapido(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(5000) });
  if (!r.ok) { const e = new Error(`TSE respondeu ${r.status}`); e.status = r.status; throw e; }
  const texto = (await r.text()).replace(/^﻿/, '');
  if (!texto.trim()) throw new Error('TSE devolveu arquivo vazio');
  return JSON.parse(texto);
}

function pausar(ms) { somaEstado.pausadoAte = Math.max(somaEstado.pausadoAte, Date.now() + ms); }

function registrarFalha() {
  somaEstado.falhas++;
  if (somaEstado.falhas >= 3) { somaEstado.pausadoAte = Date.now() + SOMA_PAUSA_MS; somaEstado.falhas = 0; }
}

// Nunca lança: qualquer problema vira { ok:false, motivo } e a rota fica com o nacional.
async function tentarSoma(nacional, turno, env) {
  // Autoauditoria primeiro: um nacional mais novo e menor que a soma já mostrada derruba a soma por 15 min.
  const anomalia = anomaliaNacional(somaEstado.entregue, nacional);
  if (anomalia) { somaEstado.entregue = null; pausar(SOMA_PAUSA_ANOMALIA_MS); return { ok: false, motivo: 'anomalia', detalhe: anomalia }; }
  if (Date.now() < somaEstado.pausadoAte) return { ok: false, motivo: 'disjuntor_aberto' };
  // Sem apuração em andamento (não começou ou 100%) não há o que ganhar e nem se gasta pedido ao TSE.
  if (!emAndamento(nacional)) return { ok: false, motivo: 'nacional_sem_andamento' };
  try {
    const carga = await carregarParaSoma({ turno, env, buscar: buscarRapido });
    if (!carga.ok) throw Object.assign(new Error(carga.motivo), { motivo: carga.motivo });
    const r = combinarComSoma({ nacional, estados: carga.estados, exterior: carga.exterior });
    // 'nacional_em_dia' é o caso normal; qualquer outra recusa (arquivo faltando, incoerente, regressão) conta para o disjuntor.
    if (r.ok || r.motivo === 'nacional_em_dia') somaEstado.falhas = 0; else registrarFalha();
    return r;
  } catch (e) {
    registrarFalha();
    return { ok: false, motivo: e.motivo || 'erro_inesperado', detalhe: e.message };
  }
}

function responderNaoPublicado(res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return res.status(404).json({ erro: 'tse_nao_publicou', status_tse: 404 });
}

async function buscar(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { const e = new Error(`TSE respondeu ${r.status}`); e.status = r.status; throw e; }
  const texto = (await r.text()).replace(/^﻿/, '');
  if (!texto.trim()) throw new Error('TSE devolveu arquivo vazio');
  return JSON.parse(texto);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const cargo = String(req.query.cargo || '');
  const alvo = urlDoResultado(cargo, req.query.uf, process.env, req.query.turno);
  // Combinação inválida (cargo, uf ou turno): 400 aqui, sem pedir nada ao TSE (404 em excesso bloqueia o IP por 10 min).
  if (!alvo) return res.status(400).json({ erro: 'cargo, uf ou turno inválido' });
  const limite = Math.min(100, Math.max(5, parseInt(req.query.limite, 10) || 30));
  const modoSoma = cargo === 'presidente' ? modoDaSoma(process.env, Date.now()) : 'off';
  const origemPedida = String(req.query.origem || '');
  const chave = `${alvo.url}|${limite}|${modoSoma}|${origemPedida}`;

  try {
    const quando404 = naoPublicado.get(alvo.url);
    if (quando404 && Date.now() - quando404 < NAO_PUBLICADO_MS) return responderNaoPublicado(res);
    const r0 = recente.get(chave);
    if (r0 && Date.now() - r0.em < segundosDeCache(r0.corpo) * 500) { // metade do tempo de borda
      res.setHeader('Cache-Control', cabecalhoDeCache(r0.corpo));
      return res.status(200).json(r0.corpo);
    }
    if (!emVoo.has(alvo.url)) {
      emVoo.set(alvo.url, buscar(alvo.url).finally(() => setTimeout(() => emVoo.delete(alvo.url), 0)));
    }
    const json = await emVoo.get(alvo.url);
    let corpo = { ...reduzirResultado(json, cargo, { limite }), turno: alvo.turno, fonte_url: alvo.url };
    if (modoSoma !== 'off' && origemPedida !== 'nacional') {
      const soma = await tentarSoma(corpo, alvo.turno, process.env);
      const motivo = soma.ok ? 'ok' : soma.motivo;
      res.setHeader('X-Apuracao-Soma', `${modoSoma}:${motivo}`);
      // 'nacional_em_dia' é o caso normal e frequente: só é registrado em sombra, para não encher o log.
      if (modoSoma === 'sombra' || motivo !== 'nacional_em_dia') {
        console.log(`apuracao-soma[${modoSoma}]: ${motivo}${soma.detalhe ? ` (${soma.detalhe})` : ''}${soma.ok ? ` adianta ${soma.corpo.votos.total - corpo.votos.total} votos; nacional ${corpo.gerado_em}` : ''}`);
      }
      const entregar = soma.ok && (modoSoma === 'on' || origemPedida === 'soma');
      if (entregar) {
        corpo = { ...soma.corpo, turno: alvo.turno, fonte_url: alvo.url };
        if (modoSoma === 'on') somaEstado.entregue = { total: soma.corpo.votos.total, carimbo: carimbo(soma.corpo.gerado_em) };
      }
      else if (origemPedida === 'soma') { // diagnóstico: diz por que não há soma
        res.setHeader('Cache-Control', 'public, s-maxage=10');
        return res.status(503).json({ erro: 'soma_indisponivel', motivo, detalhe: soma.detalhe || null });
      }
    }
    recente.set(chave, { em: Date.now(), corpo });
    res.setHeader('Cache-Control', cabecalhoDeCache(corpo));
    return res.status(200).json(corpo);
  } catch (e) {
    if (e.status === 404) {
      naoPublicado.set(alvo.url, Date.now());
      return responderNaoPublicado(res);
    }
    console.error('apuracao:', alvo.url, e.message);
    // Erro também fica na borda por pouco tempo, para uma pane do TSE não virar uma enxurrada.
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(502).json({ erro: 'tse_recusou', detalhe: e.message, status_tse: e.status || null });
  }
}
