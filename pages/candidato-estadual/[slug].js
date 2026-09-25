// Página do candidato a Deputado ESTADUAL 2026. (25/09/2026)
//
// Diferente dos outros cargos, a ficha NÃO está no banco: é lida do TSE quando alguém abre a
// página (medido em 25/09: 7 KB em ~0,14 s pela ponte). O corpo é o mesmo componente dos
// outros candidatos (components/FichaCandidatoLegislativo.jsx) e a tradução dos campos é a
// mesma dos coletores (coletores/ficha_tse_traduzir.js): CPF e título de eleitor não passam.
//
// O SLUG termina em -{sq}-{uf} (montado em src/lib/candidatosEstaduais.js). É dele que saem
// o id e o estado para pedir a ficha; o nome no começo é só para o endereço ser legível.
import FichaCandidatoLegislativo from '../../components/FichaCandidatoLegislativo';
import { lerTse, fotoTse } from '../../src/lib/tseAoVivo';
import { ID_ELEICAO_ESTADUAL, UFS_ESTADUAL } from '../../src/lib/candidatosEstaduais';
import { traduzir } from '../../coletores/ficha_tse_traduzir.js';

const ANO = 2026;
const CARGO_ESTADUAL = 7;

// "1972-06-13", "1972-06-13T00:00:00" ou "13/06/1972" → "1972-06-13". Outra coisa → null.
function dataIso(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export default function PerfilCandidatoEstadual({ candidato, canonical }) {
  return <FichaCandidatoLegislativo candidato={candidato} canonical={canonical} cargo="deputado-estadual" />;
}

export async function getServerSideProps({ params, req, res }) {
  const m = String(params.slug || '').match(/-(\d{9,15})-([a-z]{2})$/);
  const uf = m ? m[2].toUpperCase() : null;
  if (!m || !UFS_ESTADUAL.includes(uf)) return { notFound: true };
  const sq = m[1];

  let f;
  try {
    f = await lerTse(`/divulga/rest/v1/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO_ESTADUAL}/candidato/${sq}`);
  } catch (e) {
    // Fonte fora do ar não é "candidato inexistente": deixa a página de erro do site dizer isso.
    console.error('candidato-estadual:', sq, e.message);
    throw new Error('Não foi possível consultar o TSE agora.');
  }
  // Corpo vazio = combinação sem resultado. E esta rota só mostra deputado ESTADUAL: um id de
  // outro cargo aqui viraria ficha com o cargo errado no título.
  if (!f || f.cargo?.codigo !== CARGO_ESTADUAL) return { notFound: true };

  const { vices, uf_nascimento, ...ficha } = traduzir(f, () => null, sq, { ano: ANO, idEleicao: ID_ELEICAO_ESTADUAL, abrangencia: uf });
  const candidato = {
    uf,
    sq_candidato: sq,
    nr_candidato: f.numero != null ? String(f.numero) : null,
    nome_urna: f.nomeUrna || f.nomeCompleto || null,
    nome_completo: f.nomeCompleto || null,
    partido_sigla: f.partido?.sigla || null,
    partido_nome: f.partido?.nome || null,
    coligacao_nome: f.nomeColigacao || null,
    situacao_candidatura: f.descricaoSituacao || null,
    data_nascimento: dataIso(f.dataDeNascimento),
    naturalidade_uf: uf_nascimento || f.sgUfNascimento || null,
    genero: f.descricaoSexo || null,
    grau_instrucao: f.grauInstrucao || null,
    estado_civil: f.descricaoEstadoCivil || null,
    cor_raca: f.descricaoCorRaca || null,
    ocupacao: f.ocupacao || null,
    // A autorização da fonte é respeitada: se ela diz que a foto não é publicável, não publicamos.
    foto_url: f.fotoUrlPublicavel === false ? null : fotoTse(ID_ELEICAO_ESTADUAL, sq, uf),
    fonte_api: ficha.ficha_fonte_url,
    mandato: null,
    ...ficha,
  };

  // Mesma borda da lista: 30 min servindo pronto, até um dia servindo o antigo enquanto renova.
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/candidato-estadual/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(candidato)), canonical } };
}
