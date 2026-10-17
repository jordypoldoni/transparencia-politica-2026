// Registro de "quando coletamos" e "ate quando a fonte publicou" (T10 / D-036).
// Cada coletor chama registrarStatus() no FIM de uma rodada que gravou com sucesso.
// O site le a tabela fonte_status e mostra as datas ao usuario.
//
// Falha ao registrar NAO derruba a coleta: os dados ja foram gravados e a rodada nao deve ficar
// vermelha por causa de um carimbo. O custo de falhar calado e baixo e honesto: a data na tela
// simplesmente nao avanca, e o aviso aparece no log da execucao.
//
//   fonte      nome estavel da fonte (ex.: 'gastos_alergs'); o site referencia este nome
//   escopo     recorte dentro da fonte (ex.: 'RS'); '' quando a fonte e unica
//   dadosAte   'YYYY-MM-DD' do ultimo dia/mes que a FONTE ja publicou; null se ela nao informa
//   linhas     quantas linhas a rodada gravou (conferencia)
export async function registrarStatus(supabase, { fonte, escopo = '', dadosAte = null, linhas = null }) {
  try {
    const { error } = await supabase.from('fonte_status').upsert(
      { fonte, escopo, coletado_em: new Date().toISOString(), dados_ate: dadosAte, linhas },
      { onConflict: 'fonte,escopo' },
    );
    if (error) throw error;
    console.log(`Status registrado: ${fonte}${escopo ? '/' + escopo : ''} (dados ate ${dadosAte || 'n/d'}).`);
  } catch (e) {
    console.warn(`AVISO: nao consegui registrar o status de ${fonte}: ${e.message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Status da fonte::Nao registrou ${fonte}: ${e.message}`);
  }
}

// Ultimo dia do mes (ano, mes 1-12) em ISO. Usado por fontes que publicam por mes fechado.
export const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);

// Ultimo data_emissao de uma casa num ano, lido do BANCO (o que de fato ficou gravado). Para fontes
// que publicam o lancamento com a data do documento (Camara, Senado). null se nao ha nada.
export async function ultimaEmissao(supabase, casa, ano) {
  const { data } = await supabase.from('despesas_parlamentares').select('data_emissao')
    .eq('casa_legislativa', casa).eq('ano', ano).not('data_emissao', 'is', null)
    .order('data_emissao', { ascending: false }).limit(1);
  return data?.[0]?.data_emissao?.slice(0, 10) || null;
}
