// COLA PARA A URNA (27/09/2026, pedido do Jordy: "compartilhar minha cédula"). Duas coisas
// compartilháveis:
//   1) a cédula do ESTADO: é só o endereço /comecar?uf=RS;
//   2) a cédula PESSOAL (o "Meu voto"): vira um link /cola?uf=RS&df=...&s=a,b ... com o SLUG de
//      cada candidato escolhido.
//
// POR QUE NO LINK E NÃO NO BANCO: voto é dado sensível. Guardar a cola num servidor para gerar um
// link curto criaria uma cópia do voto fora do controle da pessoa. No link, quem decide quem vê é
// só ela, e o Lume não guarda nada.
//
// POR QUE SÓ O SLUG E NUNCA O NOME: a página /cola busca cada candidato na fonte (tabelas do TSE
// no banco, e o TSE ao vivo para deputado estadual). Um link com nomes e números escritos à mão
// deixaria qualquer um publicar, no domínio do Lume, uma "cola" com candidato ou número falso.
// Slug que não existe simplesmente não aparece.
//
// Funções puras: rodam no navegador (montar o link) e no servidor (ler o link).
export const CAMPOS_COLA = [
  { campo: 'df', cargo: 'deputado-federal', max: 1 },
  { campo: 'de', cargo: 'deputado-estadual', max: 1 },
  { campo: 's', cargo: 'senador', max: 2 },
  { campo: 'g', cargo: 'governador', max: 1 },
  { campo: 'p', cargo: 'presidente', max: 1 },
];
const SLUG = /^[a-z0-9][a-z0-9-]{1,159}$/;
const UF = /^[A-Z]{2}$/;

// chave do Meu voto é o caminho da ficha ("/deputado-federal/fulano-1313"): o slug é o fim dele.
const slugDaChave = (chave) => String(chave || '').split('?')[0].split('/').filter(Boolean).pop() || '';

// votos: a lista do Meu voto (useVotos). Só entram os do estado (e presidente, que é nacional).
export function montarLinkCola(origem, uf, votos) {
  const u = String(uf || '').toUpperCase();
  if (!UF.test(u)) return null;
  const p = new URLSearchParams({ uf: u });
  let algum = false;
  for (const c of CAMPOS_COLA) {
    const slugs = votos
      .filter((v) => v.cargo === c.cargo && (c.cargo === 'presidente' || v.uf === u))
      .map((v) => slugDaChave(v.chave)).filter((s) => SLUG.test(s)).slice(0, c.max);
    if (slugs.length) { p.set(c.campo, slugs.join(',')); algum = true; }
  }
  return algum ? `${origem}/cola?${p.toString()}` : null;
}

// Lê o link: { uf, pedidos: { 'deputado-federal': ['slug'], senador: ['a','b'], ... } } ou null.
export function lerLinkCola(query) {
  const uf = String(query?.uf || '').toUpperCase();
  if (!UF.test(uf)) return null;
  const pedidos = {};
  for (const c of CAMPOS_COLA) {
    const slugs = String(query?.[c.campo] || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s));
    if (slugs.length) pedidos[c.cargo] = [...new Set(slugs)].slice(0, c.max);
  }
  return { uf, pedidos };
}
