// Desenho do card de cobrança (20/10/2026, item 5 da lista do Jordy). Só roda no navegador (usa canvas).
// Recebe o objeto montado em cobranca.js e devolve a imagem PNG (Blob), em 1080px de largura e altura
// variável (mínimo 1350): o painel e a pergunta crescem com o texto, sem cortar e sem sobrepor.
//
// FOTO: a Câmara e as assembleias não liberam a imagem para outro site desenhar num canvas (CORS), então
// a foto vem pela rota própria /api/foto, que só aceita os endereços oficiais. Se falhar, vão as iniciais.
const L = 1080;
const M = 90; // margem lateral
const W = L - 2 * M;
const FONTE = 'Georgia, "Times New Roman", serif';
const COR = { fundo: '#241E52', ouro: '#FF8A00', branco: '#FFFFFF', cinza: 'rgba(255,255,255,0.6)', suave: 'rgba(255,255,255,0.85)' };

function quebrar(ctx, texto, maxW) {
  const linhas = [];
  let atual = '';
  for (const palavra of String(texto || '').split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > maxW && atual) { linhas.push(atual); atual = palavra; } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const fonte = (peso, px) => `${peso} ${px}px ${FONTE}`;
const iniciais = (nome) => {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

function retanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function carregarFoto(url) {
  return new Promise((resolve) => {
    if (!url || typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    const fim = setTimeout(() => resolve(null), 6000);
    img.onload = () => { clearTimeout(fim); resolve(img.naturalWidth > 0 ? img : null); };
    img.onerror = () => { clearTimeout(fim); resolve(null); };
    img.src = `/api/foto?u=${encodeURIComponent(url)}`;
  });
}

const CORES_VOTO = {
  sim: { bg: '#DDF3E4', fg: '#17703A' },
  nao: { bg: '#FBE0DE', fg: '#A3231B' },
};
const corVotoCard = (tipo) => CORES_VOTO[String(tipo || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()] || { bg: '#F4ECE1', fg: '#191C20' };

// Monta o desenho em duas passadas: 1) mede tudo e descobre a altura; 2) desenha.
export async function gerarImagemCobranca(c, fotoUrl) {
  const foto = await carregarFoto(fotoUrl);
  const medidor = document.createElement('canvas').getContext('2d');

  // ---- medidas ----
  medidor.font = fonte(600, 58);
  const larguraNome = W - 150 - 34;
  const linhasNome = quebrar(medidor, c.nome, larguraNome).slice(0, 2);
  medidor.font = fonte(400, 30);
  const cargoTxt = [c.cargo, c.partidoUf].filter(Boolean).join(' · ');
  const linhasCargo = quebrar(medidor, cargoTxt, larguraNome).slice(0, 2);
  const alturaPessoa = Math.max(150, linhasNome.length * 64 + linhasCargo.length * 38 + 12);

  const padX = 48;
  const larguraPainel = W - 2 * padX;
  let linhasResumo = [];
  let linhasMeta = [];
  let alturaPainel = 44; // topo
  alturaPainel += 24 + 22; // rótulo
  if (c.tipo === 'voto') {
    alturaPainel += 80 + 34; // linha do voto + respiro
    alturaPainel += 2 + 30; // separador
    alturaPainel += 24 + 14; // "SOBRE O QUÊ"
    if (c.materia) alturaPainel += 44;
    medidor.font = fonte(400, 40);
    linhasResumo = quebrar(medidor, c.contexto, larguraPainel);
    alturaPainel += linhasResumo.length * 54 + 12;
  } else {
    alturaPainel += 104 + (c.notas ? 46 : 0) + 34; // valor + notas
    alturaPainel += 2 + 30;
    alturaPainel += 24 + 14;
    medidor.font = fonte(400, 36);
    linhasMeta = quebrar(medidor, c.contexto, larguraPainel);
    alturaPainel += linhasMeta.length * 50 + 12;
  }
  alturaPainel += 40; // base

  const tamPergunta = c.pergunta.length > 70 ? 60 : 76;
  medidor.font = fonte(700, tamPergunta);
  const linhasPergunta = quebrar(medidor, c.pergunta, W);
  const alturaPergunta = linhasPergunta.length * Math.round(tamPergunta * 1.18) + (c.personalizada ? 52 : 0);

  const topoPessoa = 150;
  const topoPainel = topoPessoa + alturaPessoa + 56;
  const topoPergunta = topoPainel + alturaPainel + 80;
  const rodape = 150;
  const altura = Math.max(1350, topoPergunta + alturaPergunta + 70 + rodape);

  // ---- desenho ----
  const cv = document.createElement('canvas');
  cv.width = L; cv.height = altura;
  const x = cv.getContext('2d');
  x.fillStyle = COR.fundo; x.fillRect(0, 0, L, altura);
  x.fillStyle = COR.ouro; x.fillRect(0, 0, L, 18);

  x.textBaseline = 'alphabetic';
  x.textAlign = 'left';
  x.font = fonte(700, 26);
  x.fillStyle = COR.ouro; x.fillText('LUME CIDADÃO', M, 96);
  x.textAlign = 'right';
  x.fillStyle = COR.cinza; x.fillText('PERGUNTA PÚBLICA, COM FATO E FONTE', L - M, 96);
  x.textAlign = 'left';

  // pessoa
  const cx = M + 75; const cy = topoPessoa + alturaPessoa / 2;
  x.save();
  x.beginPath(); x.arc(cx, cy, 75, 0, Math.PI * 2); x.closePath();
  if (foto) {
    x.clip();
    const s = Math.max(150 / foto.naturalWidth, 150 / foto.naturalHeight);
    const w = foto.naturalWidth * s; const h = foto.naturalHeight * s;
    x.drawImage(foto, cx - w / 2, cy - 75, w, h); // alinhada ao topo, como no perfil
  } else {
    x.fillStyle = COR.ouro; x.fill();
    x.fillStyle = COR.fundo; x.font = fonte(700, 56); x.textAlign = 'center';
    x.fillText(iniciais(c.nome), cx, cy + 20);
    x.textAlign = 'left';
  }
  x.restore();
  x.beginPath(); x.arc(cx, cy, 75, 0, Math.PI * 2);
  x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 5; x.stroke();

  const tx = M + 150 + 34;
  let ty = cy - (linhasNome.length * 64 + linhasCargo.length * 38 + 12) / 2 + 52;
  x.fillStyle = COR.branco; x.font = fonte(600, 58);
  for (const l of linhasNome) { x.fillText(l, tx, ty); ty += 64; }
  ty += -14;
  x.fillStyle = 'rgba(255,255,255,0.72)'; x.font = fonte(400, 30);
  for (const l of linhasCargo) { x.fillText(l, tx, ty + 26); ty += 38; }

  // painel do fato
  x.fillStyle = 'rgba(255,255,255,0.09)';
  retanguloArredondado(x, M, topoPainel, W, alturaPainel, 30); x.fill();
  let py = topoPainel + 44;
  const px = M + padX;
  x.fillStyle = COR.cinza; x.font = fonte(700, 24);
  x.fillText(c.rotulo, px, py + 24);
  py += 24 + 22;

  const separador = () => {
    py += 34 - 6;
    x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(px, py, larguraPainel, 2);
    py += 2 + 30;
  };

  if (c.tipo === 'voto') {
    const cor = corVotoCard(c.votoTipo);
    const textoVoto = String(c.votoTipo).toUpperCase();
    x.font = fonte(700, 64);
    const wTag = x.measureText(textoVoto).width + 68;
    x.fillStyle = cor.bg; retanguloArredondado(x, px, py, wTag, 80, 16); x.fill();
    x.fillStyle = cor.fg; x.fillText(textoVoto, px + 34, py + 58);
    if (c.resultado) { x.fillStyle = COR.suave; x.font = fonte(400, 32); x.fillText(c.resultado, px + wTag + 26, py + 54); }
    py += 80;
    separador();
    x.fillStyle = COR.cinza; x.font = fonte(700, 24); x.fillText('SOBRE O QUÊ', px, py + 20);
    py += 24 + 14;
    if (c.materia) { x.fillStyle = COR.ouro; x.font = fonte(700, 32); x.fillText(c.materia, px, py + 30); py += 44; }
    x.fillStyle = COR.branco; x.font = fonte(400, 40);
    for (const l of linhasResumo) { x.fillText(l, px, py + 40); py += 54; }
  } else {
    x.fillStyle = COR.ouro; x.font = fonte(700, 96); x.fillText(c.destaque, px, py + 80);
    py += 104;
    if (c.notas) { x.fillStyle = COR.suave; x.font = fonte(400, 32); x.fillText(c.notas, px, py + 30); py += 46; }
    separador();
    x.fillStyle = COR.cinza; x.font = fonte(700, 24); x.fillText(c.rotuloContexto, px, py + 20);
    py += 24 + 14;
    x.fillStyle = COR.suave; x.font = fonte(400, 36);
    for (const l of linhasMeta) { x.fillText(l, px, py + 36); py += 50; }
  }

  // pergunta (com respiro entre o painel e ela)
  let qy = topoPergunta;
  if (c.personalizada) {
    x.fillStyle = COR.ouro; x.font = fonte(700, 24); x.fillText('PERGUNTA DE UM CIDADÃO', M, qy + 20);
    qy += 52;
  }
  x.fillStyle = COR.branco; x.font = fonte(700, tamPergunta);
  const alt = Math.round(tamPergunta * 1.18);
  for (const l of linhasPergunta) { x.fillText(l, M, qy + tamPergunta * 0.85); qy += alt; }

  // rodapé: o aviso em cima, a fonte e o site embaixo, tudo colado na base
  x.font = fonte(400, 28);
  const rodLinhas = quebrar(x, `${c.fonte}. Confira você mesmo: lumecidadao.com.br`, W);
  let ry = altura - 50 - (rodLinhas.length - 1) * 38;
  x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = fonte(400, 26);
  x.fillText(c.aviso, M, ry - 46);
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = fonte(400, 28);
  for (const l of rodLinhas) { x.fillText(l, M, ry); ry += 38; }

  return new Promise((r) => cv.toBlob(r, 'image/png'));
}
