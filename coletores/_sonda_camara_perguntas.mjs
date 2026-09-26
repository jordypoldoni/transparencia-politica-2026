// Sonda (25/09/2026): as perguntas do questionário do "Pra você" são votações do SENADO. Os
// mesmos projetos passaram pela CÂMARA; esta sonda acha, para cada um, as votações de PLENÁRIO
// na Câmara, para escolhermos a que corresponde à mesma pergunta (o texto inteiro, não emenda).
// Só lê a API de dados abertos da Câmara; não grava nada. Uso: node coletores/_sonda_camara_perguntas.mjs
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const H = { Accept: 'application/json' };

const PROJETOS = [
  ['Dosimetria (8/1)', 'PL', 2162, 2023],
  ['Licenciamento ambiental (no Senado PL 2159/2021)', 'PL', 3729, 2004],
  ['Marco temporal, PEC do Senado', 'PEC', 48, 2023],
  ['Marco temporal, lei (no Senado PL 2903/2023)', 'PL', 490, 2007],
  ['Reforma tributária', 'PEC', 45, 2019],
  ['Arcabouço fiscal', 'PLP', 93, 2023],
  ['Drogas, PEC do Senado', 'PEC', 45, 2023],
  ['Despejos na pandemia', 'PL', 827, 2020],
  ['Marco do saneamento', 'PL', 4162, 2019],
];

const json = async (url) => { const r = await fetch(url, { headers: H }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

for (const [rotulo, sigla, numero, ano] of PROJETOS) {
  console.log(`\n■ ${rotulo}: ${sigla} ${numero}/${ano}`);
  try {
    const props = (await json(`${API}/proposicoes?siglaTipo=${sigla}&numero=${numero}&ano=${ano}`)).dados || [];
    if (!props.length) { console.log('   não encontrada na Câmara com esse número'); continue; }
    for (const p of props) {
      const vots = ((await json(`${API}/proposicoes/${p.id}/votacoes`)).dados || []).filter((v) => v.siglaOrgao === 'PLEN');
      console.log(`   proposição ${p.id} · ${vots.length} votações de plenário`);
      for (const v of vots.sort((a, b) => String(a.dataHoraRegistro || a.data).localeCompare(String(b.dataHoraRegistro || b.data)))) {
        console.log(`   ${String(v.data).slice(0, 10)} · ${v.id} · ${String(v.descricao || '').replace(/\s+/g, ' ').slice(0, 150)}`);
      }
    }
  } catch (e) { console.log(`   ERRO: ${e.message}`); }
}
