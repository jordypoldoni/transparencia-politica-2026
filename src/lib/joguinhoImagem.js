// Imagem de compartilhamento do joguinho (23/10/2026). Desenhada em canvas, no navegador do
// próprio usuário: nada é enviado ao servidor (opinião política é dado sensível, LGPD).
// Formatos: post 1080x1350 (Instagram e Facebook) e story 1080x1920. Fundo escuro ou claro.
// O usuário escolhe o que aparece; o título com a faixa geral aparece sempre.
import { FAIXAS, CORES, posicao } from './joguinhoIdeologia';

export const FORMATOS = { post: { w: 1080, h: 1350, rotulo: 'Post' }, story: { w: 1080, h: 1920, rotulo: 'Story' } };
export const URL_JOGO = 'lumecidadao.com.br/entenda/joguinho';

const TEMAS = {
  escuro: { bg: '#241E52', fg: '#FFFFFF', sub: '#C9C6E0', acc: '#FF8A00', card: '#2F2866', plano: '#3A3278', plano2: '#443C86', linha: '#8B87B8', borda: '#241E52', logo: '/marca-lume-branca.svg' },
  claro: { bg: '#F7F6F3', fg: '#191C20', sub: '#666E7B', acc: '#A85B00', card: '#FFFFFF', plano: '#FAF5EE', plano2: '#F4ECE1', linha: '#666E7B', borda: '#FFFFFF', logo: '/marca-lume.svg' },
};
const TITULO = '"Fraunces", Georgia, serif';
const CORPO = '"Public Sans", system-ui, -apple-system, sans-serif';

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function carregarImagem(src) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
}
async function carregarFontes() {
  try {
    await Promise.all(['600 40px Fraunces', '400 24px "Public Sans"', '700 24px "Public Sans"'].map((f) => document.fonts.load(f)));
  } catch { /* sem fontes da marca, cai na fonte do sistema */ }
}
function texto(c, s, x, y, { fonte, cor, align = 'left' }) { c.font = fonte; c.fillStyle = cor; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); }

function regua(c, th, x, y, w, titulo, nota, media) {
  texto(c, titulo, x, y + 30, { fonte: `600 34px ${TITULO}`, cor: th.fg });
  texto(c, nota, x + w, y + 30, { fonte: `700 30px ${CORPO}`, cor: th.acc, align: 'right' });
  const by = y + 52, bh = 26;
  c.save(); rr(c, x, by, w, bh, 13); c.clip();
  CORES.forEach((cor, i) => { c.fillStyle = cor; c.fillRect(x + (w / 5) * i, by, w / 5 + 1, bh); });
  c.restore();
  const px = x + (posicao(media) / 100) * w;
  rr(c, px - 15, by - 10, 30, 46, 15); c.fillStyle = '#FF8A00'; c.fill(); c.lineWidth = 5; c.strokeStyle = th.borda; c.stroke();
  const rot = { fonte: `400 22px ${CORPO}`, cor: th.sub };
  texto(c, 'Esquerda', x, by + 62, rot); texto(c, 'Centro', x + w / 2, by + 62, { ...rot, align: 'center' }); texto(c, 'Direita', x + w, by + 62, { ...rot, align: 'right' });
}
const ALT_REGUA = 150;

function plano(c, th, cx, y, S, r) {
  const w = S, h = S * 0.8, x = cx - w / 2;
  c.save(); rr(c, x, y, w, h, 26); c.fillStyle = th.plano; c.fill(); c.clip();
  c.globalAlpha = 0.6; c.fillStyle = th.plano2; c.fillRect(x, y, w / 2, h / 2); c.fillRect(x + w / 2, y + h / 2, w / 2, h / 2); c.globalAlpha = 1;
  c.restore();
  c.fillStyle = th.linha; c.fillRect(x + w / 2 - 1.5, y, 3, h); c.fillRect(x, y + h / 2 - 1.5, w, 3);
  const bx = x + (posicao(r.economia) / 100) * w, by = y + (posicao(r.costumes) / 100) * h;
  c.beginPath(); c.arc(bx, by, 35, 0, 7); c.lineWidth = 3; c.strokeStyle = 'rgba(255,138,0,0.5)'; c.stroke();
  c.beginPath(); c.arc(bx, by, 22, 0, 7); c.fillStyle = '#FF8A00'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  const b = { fonte: `700 24px ${CORPO}`, cor: th.fg, align: 'center' };
  texto(c, 'Mais liberal', cx, y - 16, b); texto(c, 'Mais conservador', cx, y + h + 34, b);
  texto(c, 'Estado', x + 14, y + h / 2 - 12, { ...b, fonte: `700 22px ${CORPO}`, align: 'left' });
  texto(c, 'Mercado', x + w - 14, y + h / 2 - 12, { ...b, fonte: `700 22px ${CORPO}`, align: 'right' });
}

// Quebra o título em linhas que cabem em `max`, sem partir "centro-esquerda".
function linhas(c, partes, max) {
  const out = []; let atual = [];
  const larg = (ps) => ps.reduce((s, p) => s + c.measureText(p.t).width, 0);
  partes.forEach((p) => {
    c.font = p.f;
    if (atual.length && larg([...atual, p]) > max) { out.push(atual); atual = []; }
    atual.push(p);
  });
  if (atual.length) out.push(atual);
  return out;
}

// `r` = resultado(respostas). `mostrar` = { geral, economia, costumes, plano } (booleans).
export async function desenharImagem(canvas, { formato = 'post', tema = 'escuro', mostrar = {}, r }) {
  const F = FORMATOS[formato] || FORMATOS.post, th = TEMAS[tema] || TEMAS.escuro;
  await carregarFontes();
  const logo = await carregarImagem(th.logo);
  canvas.width = F.w; canvas.height = F.h;
  const c = canvas.getContext('2d');
  const story = formato === 'story';
  const pad = story ? 90 : 80, W = F.w - pad * 2;
  c.fillStyle = th.bg; c.fillRect(0, 0, F.w, F.h);

  let y = story ? 150 : 70;
  if (logo) { const h = 46, w = (logo.width / logo.height) * h; c.drawImage(logo, pad, y, w, h); }
  y += (story ? 46 + 70 : 46 + 40);

  texto(c, 'Meu resultado no joguinho do Lume', pad, y + 20, { fonte: `400 28px ${CORPO}`, cor: th.sub });
  y += 20 + 14;
  const hf = story ? 84 : 64, ft = `600 ${hf}px ${TITULO}`;
  const partes = [{ t: 'Minhas respostas apontam para: ', f: ft, cor: th.fg }, { t: FAIXAS[r.faixaGeral].toLowerCase(), f: ft, cor: th.acc }];
  // palavras soltas para quebrar, mantendo a faixa (com hífen) inteira
  const pecas = [{ t: 'Minhas ', f: ft, cor: th.fg }, { t: 'respostas ', f: ft, cor: th.fg }, { t: 'apontam ', f: ft, cor: th.fg }, { t: 'para: ', f: ft, cor: th.fg }, { t: partes[1].t, f: ft, cor: th.acc }];
  const ls = linhas(c, pecas, W);
  ls.forEach((l, i) => {
    let x = pad; const base = y + hf * (1.08 * i + 0.95);
    l.forEach((p) => { texto(c, p.t, x, base, { fonte: p.f, cor: p.cor }); x += c.measureText(p.t).width; });
  });
  y += hf * 1.08 * ls.length + (story ? 70 : 40);

  const reguas = [
    mostrar.geral && ['Visão geral', FAIXAS[r.faixaGeral], r.geral],
    mostrar.economia && ['Economia', FAIXAS[r.faixaEconomia], r.economia],
    mostrar.costumes && ['Costumes', FAIXAS[r.faixaCostumes], r.costumes],
  ].filter(Boolean);
  const rodape = F.h - (story ? 60 : 40);
  const reservaRodape = 90;
  if (reguas.length) {
    const ph = (story ? 44 : 30) + reguas.length * ALT_REGUA - 34 + (story ? 14 : 0) + 24;
    c.save(); rr(c, pad, y, W, ph, 32); c.fillStyle = th.card; c.fill(); c.restore();
    reguas.forEach((g, i) => regua(c, th, pad + 44, y + (story ? 44 : 30) + i * ALT_REGUA, W - 88, ...g));
    y += ph + (story ? 100 : 70);
  }
  if (mostrar.plano) {
    const livre = rodape - reservaRodape - y - 80;
    const S = Math.max(240, Math.min(560, livre / 0.8));
    plano(c, th, F.w / 2, y + 36, S, r);
  }

  texto(c, 'E você, para onde aponta?', pad, rodape, { fonte: `400 28px ${CORPO}`, cor: th.fg });
  texto(c, URL_JOGO, F.w - pad, rodape, { fonte: `700 28px ${CORPO}`, cor: th.acc, align: 'right' });
}

export function canvasParaArquivo(canvas, nome) {
  return new Promise((ok) => canvas.toBlob((b) => ok(b ? new File([b], nome, { type: 'image/png' }) : null), 'image/png'));
}
