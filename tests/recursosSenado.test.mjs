import test from 'node:test';
import assert from 'node:assert/strict';
import { lerRecursos } from '../coletores/_recursos_senado.js';

const ok = { statusCode: 200, data: [{
  cotas: { despesas: [{ recurso: 'Aquisição de material de consumo', valor: 39317.96 }], totalValor: 414045.77 },
  gastosNaoInclusos: { despesas: [{ recurso: 'Correios', valor: 28993.57 }, { recurso: 'Viagens Oficiais - Diárias', valor: 0 }], totalValor: 80602.05 },
  beneficios: [{ beneficio: 'Auxílio-Moradia', utilizacao: 'Utilizou' }, { beneficio: 'Imóvel Funcional', utilizacao: 'Não utilizou' }],
  pessoal: [{ local: 'Gabinete', quantidade: 21, vinculos: [{ vinculo: 'Comissionado', quantidade: 19 }, { vinculo: 'Efetivo', quantidade: 2 }] }],
}] };

test('le os quatro blocos', () => {
  const r = lerRecursos(ok);
  assert.equal(r.cotas_total, 414045.77);
  assert.equal(r.nao_inclusos_total, 80602.05);
  assert.equal(r.nao_inclusos.length, 2);
  assert.equal(r.beneficios[0].utilizacao, 'Utilizou');
  assert.equal(r.pessoal[0].vinculos[1].quantidade, 2);
});
test('sem registro devolve null', () => assert.equal(lerRecursos({ data: [] }), null));
test('estrutura inesperada lanca erro', () => {
  assert.throws(() => lerRecursos({}), /sem "data"/);
  assert.throws(() => lerRecursos({ data: [{ cotas: {}, gastosNaoInclusos: { despesas: [], totalValor: 0 } }] }), /cotas/);
  assert.throws(() => lerRecursos({ data: [{ ...ok.data[0], gastosNaoInclusos: { despesas: [{ recurso: 'X', valor: 'abc' }], totalValor: 1 } }] }), /invalido/);
  assert.throws(() => lerRecursos({ data: [ok.data[0], ok.data[0]] }), /2 registros/);
});
