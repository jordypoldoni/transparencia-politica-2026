// Ajuda comum dos coletores de TOTAIS das Assembleias (tabela gastos_assembleia_totais).
// Cada coletor baixa o dado aberto do estado, soma por mês e grava só o total (sem lançamento a lançamento).
// Sem credencial (SUPABASE_*), ou com --dry, só imprime o resultado: serve de teste e de carga manual.
import 'dotenv/config';

export const NUM = (s) => {
  const t = String(s ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

// Lê CSV com separador ';' e aspas duplas (campos podem ter ';' e quebra de linha dentro das aspas).
export function lerCsv(texto, sep = ';') {
  const linhas = []; let campo = ''; let linha = []; let aspas = false;
  const t = texto.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some((x) => x !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); if (linha.some((x) => x !== '')) linhas.push(linha); }
  return linhas;
}

export async function baixarTexto(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'LumeCidadao/1.0 (transparencia; contato via site)', 'Accept-Language': 'pt-BR' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tentativas) throw new Error(`Falha ao baixar ${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

// linhas: [{uf, ano, mes, total, n_lancamentos, n_deputados, por_categoria, o_que_inclui, fonte_url, fonte}]
export async function gravarTotais(linhas, { dry = false } = {}) {
  if (dry || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(JSON.stringify(linhas));
    console.error(`(sem gravar) ${linhas.length} linhas.`);
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from('gastos_assembleia_totais')
    .upsert(linhas.map((l) => ({ ...l, coletado_em: new Date().toISOString() })), { onConflict: 'uf,ano,mes' });
  if (error) throw error;
  console.log(`Gravadas ${linhas.length} linhas.`);
}
