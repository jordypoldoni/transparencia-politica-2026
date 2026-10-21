import test from 'node:test';
import assert from 'node:assert/strict';
import { intervalosCamara, intervalosSenado, normalizaSituacao } from '../coletores/exercicio_intervalos.js';

test('situacao: so Exercicio e normalizado, o resto fica como a fonte escreveu', () => {
  assert.equal(normalizaSituacao('Exercicio'), 'Exercício');
  assert.equal(normalizaSituacao('EXERCÍCIO'), 'Exercício');
  assert.equal(normalizaSituacao('Licença'), 'Licença');
  assert.equal(normalizaSituacao(''), null);
});

test('Camara: cada evento vale ate o dia anterior ao proximo e troca de partido nao quebra o intervalo', () => {
  const r = intervalosCamara([
    { dataHora: '2022-07-13T18:01', situacao: 'Licença', condicaoEleitoral: 'Titular', descricaoStatus: 'Saída - Afastamento' },
    { dataHora: '2019-02-01T11:45', situacao: 'Exercício', condicaoEleitoral: 'Titular', descricaoStatus: 'Posse' },
    { dataHora: '2019-02-26T17:28', situacao: 'Exercício', condicaoEleitoral: 'Titular', descricaoStatus: 'Alteração de partido' },
    { dataHora: '2023-01-10T10:00', situacao: 'Exercício', condicaoEleitoral: 'Titular', descricaoStatus: 'Retorno' },
  ]);
  assert.deepEqual(r.map((x) => [x.data_inicio, x.data_fim, x.situacao]), [
    ['2019-02-01', '2022-07-12', 'Exercício'],
    ['2022-07-13', '2023-01-09', 'Licença'],
    ['2023-01-10', null, 'Exercício'],
  ]);
});

test('Camara: lista vazia ou evento sem data nao gera nada', () => {
  assert.deepEqual(intervalosCamara([]), []);
  assert.deepEqual(intervalosCamara(null), []);
  assert.deepEqual(intervalosCamara([{ situacao: 'Exercício' }]), []);
});

test('Camara: duas situacoes no mesmo dia, a ultima vence', () => {
  const r = intervalosCamara([
    { dataHora: '2026-03-01T08:00', situacao: 'Exercício', condicaoEleitoral: 'Suplente' },
    { dataHora: '2026-03-01T09:00', situacao: 'Licença', condicaoEleitoral: 'Suplente' },
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].situacao, 'Licença');
  assert.equal(r[0].data_fim, null);
});

test('Senado: Exercicios viram intervalos de Exercicio, com a causa e a participacao', () => {
  const r = intervalosSenado({
    DescricaoParticipacao: '1º Suplente',
    Exercicios: { Exercicio: [
      { DataInicio: '2024-06-20', DataFim: '2024-10-17', DescricaoCausaAfastamento: 'Retorno do titular' },
      { DataInicio: '2025-01-05' },
    ] },
  });
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { data_inicio: '2024-06-20', data_fim: '2024-10-17', situacao: 'Exercício', condicao: '1º Suplente', motivo: 'Retorno do titular' });
  assert.equal(r[1].data_fim, null);
});

test('Senado: um Exercicio so (objeto, nao lista) e mandato sem Exercicios funcionam', () => {
  assert.equal(intervalosSenado({ Exercicios: { Exercicio: { DataInicio: '2019-02-01' } } }).length, 1);
  assert.deepEqual(intervalosSenado({ DescricaoParticipacao: 'Titular' }), []);
  assert.deepEqual(intervalosSenado(undefined), []);
});
