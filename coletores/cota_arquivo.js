// Leitura do ARQUIVO ANUAL da cota parlamentar da Camara. Fonte UNICA.
//
// Vivia dentro do coletor_gastos_arquivo.js. Saiu para ca em 24/09/2026, quando o cadastro
// dos deputados faltantes passou a precisar do mesmo arquivo: o parser de CSV com maquina de
// estado e a decisao de encoding sao delicados demais para existirem em duas copias.
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

export const urlCotaAnual = (ano) => `https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`;

// O CSV da Camara usa ; como separador e " como delimitador, e ha ; dentro de campo
// (nome de fornecedor, trecho de viagem). Split nao serve: precisa de maquina de estado.
export function lerCsv(texto) {
  const linhas = [];
  let campo = '', linha = [], dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else dentroDeAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === ';') { linha.push(campo); campo = ''; continue; }
    if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; continue; }
    if (c === '\r') continue;
    campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// "1467" ou "1467,25" ou "1.467,25" — virgula e decimal quando existe.
export function paraNumero(v) {
  const s = (v || '').trim();
  if (!s) return 0;
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function baixarCotaAnual(ano) {
  const url = urlCotaAnual(ano);
  console.log(`⬇️  ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar o arquivo anual`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`   ${(buf.length / 1048576).toFixed(1)} MB compactados.`);
  const entrada = new AdmZip(buf).getEntries().find((e) => e.entryName.toLowerCase().endsWith('.csv'));
  if (!entrada) throw new Error('nenhum .csv dentro do zip');
  const bruto = entrada.getData();
  // A Camara ja serviu este arquivo em ISO-8859-1 no passado. Decide pelo conteudo, nao pela fe.
  let texto = bruto.toString('utf8');
  const quebrados = (texto.match(/�/g) || []).length;
  if (quebrados > 50) {
    console.log(`   (${quebrados} caracteres invalidos em UTF-8, relendo como ISO-8859-1)`);
    texto = iconv.decode(bruto, 'latin1');
  }
  console.log(`   ${entrada.entryName}: ${(bruto.length / 1048576).toFixed(1)} MB.`);
  return texto;
}
