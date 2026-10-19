// Leitura do CSV da CEAPS (19/10/2026): o bug das passagens aereas (colunas deslocadas por ';' no DETALHAMENTO).
import test from 'node:test';
import assert from 'node:assert/strict';
import { lerCeaps } from '../coletores/_ceaps.js';

const CAB = '"ANO";"MES";"SENADOR";"TIPO_DESPESA";"CNPJ_CPF";"FORNECEDOR";"DOCUMENTO";"DATA";"DETALHAMENTO";"VALOR_REEMBOLSADO";"COD_DOCUMENTO"';
const arq = (...linhas) => ['"ULTIMA ATUALIZACAO";"19/10/2026 09:00"', CAB, ...linhas].join('\r\n');

const normal = '"2026";"3";"PAULO PAIM";"Aluguel de imóveis";"11.111.111/0001-11";"Imobiliaria X";"123";"05/03/2026";"Aluguel do escritorio";"4000,00";"2200001"';
// Passagem: o DETALHAMENTO tem ';' no meio (o caso real que zerava o valor).
const passagem = '"2026";"4";"PAULO PAIM";"Passagens aéreas, aquáticas e terrestres nacionais";"22.222.222/0001-22";"LATAM";"ABC123";"10/04/2026";"Cia LATAM; voo 3018; POA/BSB; passageiro Fulano";"2338,36";"2298001"';

test('linha normal: campos nas posicoes certas', () => {
  const r = lerCeaps(arq(normal));
  assert.equal(r.anomalias.length, 0);
  assert.equal(r.lancamentos.length, 1);
  const l = r.lancamentos[0];
  assert.equal(l.senador, 'PAULO PAIM');
  assert.equal(l.valor, '4000,00');
  assert.equal(l.cod, '2200001');
  assert.equal(l.detalhamento, 'Aluguel do escritorio');
});

test('passagem com ; no DETALHAMENTO: valor e codigo continuam nos lugares (bug original)', () => {
  const r = lerCeaps(arq(passagem));
  assert.equal(r.anomalias.length, 0);
  const l = r.lancamentos[0];
  assert.equal(l.valor, '2338,36');
  assert.equal(l.cod, '2298001');
  assert.equal(l.documento, 'ABC123');
  assert.equal(l.data, '10/04/2026');
  assert.match(l.detalhamento, /LATAM; voo 3018; POA\/BSB/);
});

test('quebra de linha dentro do DETALHAMENTO nao parte o lancamento nem engole o proximo', () => {
  const quebrada = '"2026";"5";"PAULO PAIM";"Passagens aéreas, aquáticas e terrestres nacionais";"22.222.222/0001-22";"GOL";"XYZ";"02/05/2026";"Trecho 1\r\nTrecho 2; ida e volta";"1500,50";"2298002"';
  const r = lerCeaps(arq(normal, quebrada, normal));
  assert.equal(r.total, 3);
  assert.equal(r.anomalias.length, 0);
  assert.deepEqual(r.lancamentos.map((x) => x.valor), ['4000,00', '1500,50', '4000,00']);
});

test('valor que nao parece numero vira anomalia, nunca zero calado', () => {
  const ruim = normal.replace('"4000,00"', '"texto solto"');
  const r = lerCeaps(arq(ruim, normal));
  assert.equal(r.lancamentos.length, 1);
  assert.equal(r.anomalias.length, 1);
  assert.equal(r.anomalias[0].motivo, 'valor que nao parece numero');
});

test('valor com milhar (1.234,56) e negativo sao aceitos', () => {
  const r = lerCeaps(arq(normal.replace('"4000,00"', '"1.234,56"'), normal.replace('"4000,00"', '"-50,00"')));
  assert.equal(r.anomalias.length, 0);
  assert.deepEqual(r.lancamentos.map((x) => x.valor), ['1.234,56', '-50,00']);
});

test('centavos sem zero antes da virgula (",10") sao aceitos; vazio e so sinal nao', () => {
  const r = lerCeaps(arq(normal.replace('"4000,00"', '",10"'), normal.replace('"4000,00"', '""'), normal.replace('"4000,00"', '"-"')));
  assert.deepEqual(r.lancamentos.map((l) => l.valor), [',10']);
  assert.equal(r.anomalias.length, 2);
});

test('cabecalho sem coluna obrigatoria derruba a leitura (formato mudou)', () => {
  assert.throws(() => lerCeaps('"ANO";"SENADOR";"VALOR"\r\n"2026";"X";"1,00"'), /sem as colunas/);
});
