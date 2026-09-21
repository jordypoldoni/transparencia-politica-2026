// Tradução da ficha do DivulgaCandContas: de 81 campos crus para o que o site mostra.
//
// VIVE EM ARQUIVO PRÓPRIO DESDE 20/09/2026, quando a ficha deixou de ser só dos 14
// presidenciáveis e passou a valer para os 7.703 deputados federais. Cada decisão aqui custou
// uma sessão de investigação (o descarte de cpf e tituloEleitor, o st_DIVULGA_BENS respeitado,
// o totalDeBens que não se recalcula, os `sites` com "https://" colado num arroba). Duas cópias
// disso seriam duas para manter em sincronia, que é o erro evitado na própria ponte em 19/09.
//
// A ABRANGÊNCIA É PARÂMETRO: presidente é BR, deputado federal é a UF. Medido em 20/09, pedir a
// ficha de um deputado com abrangência BR devolve HTTP 200 com CORPO VAZIO, não erro.

// LINK DA CANDIDATURA ANTERIOR (21/09/2026). O `txLink` que a ficha traz em cada eleição anterior
// está num formato antigo do portal (#/candidato/{ano}/{idEleicao}/{ue}/{sq}) e abre a página
// "ERRO AO CARREGAR A PÁGINA". Gravamos 16.761 links assim em 20/09 sem abrir nenhum, e o Jordy
// é que encontrou. O formato que funciona hoje, testado no navegador em 21/09:
//     #/candidato/{REGIAO}/{UF}/{idEleicao}/{sq}/{ano}/{ue}
// Testado também com região e UF ERRADAS (NORDESTE/BA para um prefeito de Porto Alegre) e com
// BRASIL/BR: abre igual. O portal roteia pelos quatro números; região e UF são decorativas.
// Por isso usamos a UF quando ela é conhecida e BR quando não é, sem arriscar nada.
// O original fica guardado em url_original, e os três identificadores ficam soltos porque são
// o que se usa para buscar os detalhes daquela eleição.
const REGIAO = {
  RS: 'SUL', SC: 'SUL', PR: 'SUL',
  SP: 'SUDESTE', RJ: 'SUDESTE', MG: 'SUDESTE', ES: 'SUDESTE',
  DF: 'CENTROOESTE', GO: 'CENTROOESTE', MT: 'CENTROOESTE', MS: 'CENTROOESTE',
  AM: 'NORTE', PA: 'NORTE', AC: 'NORTE', RO: 'NORTE', RR: 'NORTE', AP: 'NORTE', TO: 'NORTE',
};
function linkCandidaturaAnterior(txLink, ufConhecida) {
  const m = String(txLink || '').match(/#\/candidato\/(\d{4})\/(\d+)\/([^/]+)\/(\d+)$/);
  if (!m) return { url: null, id_eleicao: null, ue: null, sq: null };
  const [, anoE, idEleicao, ue, sq] = m;
  const uf = /^[A-Z]{2}$/.test(ufConhecida || '') && ufConhecida !== 'BR' ? ufConhecida
    : (/^[A-Z]{2}$/.test(ue) ? ue : 'BR');
  const regiao = uf === 'BR' ? 'BRASIL' : (REGIAO[uf] || 'NORDESTE');
  return {
    url: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${regiao}/${uf}/${idEleicao}/${sq}/${anoE}/${ue}`,
    id_eleicao: idEleicao, ue, sq,
  };
}

export function traduzir(f, nomeDe, sq, { ano = 2026, idEleicao = 20322002026, abrangencia = 'BR' } = {}) {
  return {
    situacao_tse: f.descricaoSituacao || null,
    apto_tse: typeof f.candidatoApto === 'boolean' ? f.candidatoApto : null,
    consta_da_urna: f.descricaoSituacaoCandidato || null,
    totalizacao_tse: f.descricaoTotalizacao || null,
    numero_processo: f.numeroProcesso || null,
    motivos: Array.isArray(f.motivos) ? f.motivos.filter(Boolean) : [],

    // O TSE PUBLICA a substituição em campo próprio — não é dedução por código de status.
    substituido: f.st_SUBSTITUIDO === true,
    substituto_sq: f.substituto?.sqCandidato ? String(f.substituto.sqCandidato) : null,
    substituto_nome: nomeDe(f.substituto?.sqCandidato),

    // O CSV em lote só traz a UF de nascimento; município e nacionalidade só existem aqui.
    municipio_nascimento: f.nomeMunicipioNascimento || null,
    uf_nascimento: f.sgUfNascimento || null,
    nacionalidade: f.nacionalidade || null,

    // O campo `url` da fonte vem relativo e inservível. O caminho que FUNCIONA é
    // /divulga/rest/arquivo/doc/{idArquivo} — é de onde lemos o plano do Marçal em 13/09.
    documentos: (Array.isArray(f.arquivos) ? f.arquivos : [])
      .filter((a) => a?.idArquivo && a?.nome)
      .map((a) => ({ nome: a.nome, tipo: a.tipo || null, url: `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${a.idArquivo}` })),

    // A fonte devolve handles com "https://" colado na frente ("https://@fulano"). Virar
    // link assim dá 404, e montar "instagram.com/fulano" seria fabricar endereço que o
    // candidato não declarou. Domínio de verdade vira link; arroba fica texto.
    redes: (Array.isArray(f.sites) ? f.sites : [])
      .map((x) => String(x || '').trim()).filter(Boolean)
      .map((bruto) => {
        const semProtocolo = bruto.replace(/^https?:\/\//i, '').trim();
        const ehArroba = semProtocolo.startsWith('@');
        const temDominio = /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(semProtocolo);
        return { texto: semProtocolo, url: (!ehArroba && temDominio) ? `https://${semProtocolo}` : null };
      }),

    // st_DIVULGA_BENS é respeitado: hoje vem true nos 14, mas a flag existe para o caso de o
    // TSE restringir a divulgação, e ignorá-la seria publicar contra a fonte.
    // totalDeBens vem do TSE; NÃO recalculamos somando os itens — se a soma divergir
    // (arredondamento, bem sem valor), o número exibido continua sendo o oficial.
    divulga_bens: f.st_DIVULGA_BENS !== false,
    total_de_bens: typeof f.totalDeBens === 'number' ? f.totalDeBens : null,
    bens: (Array.isArray(f.bens) ? f.bens : []).map((b) => ({
      descricao: b.descricao || null,
      tipo: b.descricaoDeTipoDeBem || null,
      valor: typeof b.valor === 'number' ? b.valor : null,
    })),

    // A fonte agrupa vices por NÚMERO DE URNA, não por chapa: os dois presidentes do mesmo
    // número recebem a MESMA lista, e sq_CANDIDATO_SUPERIOR vem null. Guardamos a lista e
    // NÃO afirmamos de quem é cada vice — a tela mostra a ressalva.
    vices: (Array.isArray(f.vices) ? f.vices : []).map((v) => ({
      sq: v.sq_CANDIDATO ? String(v.sq_CANDIDATO) : null,
      nome: v.nm_URNA || v.nm_CANDIDATO || null,
      apto: typeof v.candidatoApto === 'boolean' ? v.candidatoApto : null,
    })),

    // HISTÓRICO POLÍTICO (20/09/2026). A fonte publica isto e a tradução ignorava.
    // Guarda o que dá para AFIRMAR: em que ano, para que cargo, onde, por qual partido e como
    // terminou. Dá para ver troca de partido, mudança de cargo e derrota, que são fato, não
    // julgamento. Cada linha leva o link da candidatura daquele ano na fonte.
    //
    // A PRIMEIRA LINHA DA LISTA É A ELEIÇÃO DE AGORA ("Concorrendo"), não passado: sai aqui,
    // senão a tela mostraria a candidatura atual como se fosse histórico.
    //
    // `local` é o estado quando o cargo é federal ou estadual, e o MUNICÍPIO quando é prefeito
    // ou vereador. É por isso que ele é guardado como veio, em vez de virar "UF".
    eleicoes_anteriores: (Array.isArray(f.eleicoesAnteriores) ? f.eleicoesAnteriores : [])
      .filter((e) => e && Number(e.nrAno) && Number(e.nrAno) !== Number(ano))
      .map((e) => ({
        ano: Number(e.nrAno),
        cargo: e.cargo || null,
        local: e.local || null,
        partido: e.partido || null,
        // "Eleito por QP" e "Eleito por média" são coisas diferentes e a fonte separa; não
        // colapsamos em "eleito", porque a distinção é justamente o que quase ninguém sabe.
        resultado: e.situacaoTotalizacao || null,
        numero: e.nrCandidato ? Number(e.nrCandidato) : null,
        ...linkCandidaturaAnterior(e.txLink, abrangencia),
        url_original: e.txLink || null,
      }))
      .sort((a, b) => b.ano - a.ano),

    ficha_coletada_em: new Date().toISOString(),
    ficha_fonte_url: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${abrangencia}/${abrangencia}/${idEleicao}/${sq}/${ano}/${abrangencia}`,
  };
}

