import test from 'node:test';
import assert from 'node:assert/strict';
import { cargoProcurado, rotuloCargoAutor, escolherPerfilUnico } from '../src/lib/autorVotacao.js';

test('a casa da votação decide o cargo procurado', () => {
  assert.equal(cargoProcurado('camara'), 'Deputado Federal');
  assert.equal(cargoProcurado('rs'), 'Deputado Estadual');
  assert.equal(cargoProcurado('senado'), null);
});

test('rótulo usa o cargo do perfil e o gênero', () => {
  assert.equal(rotuloCargoAutor({ cargo_atual: 'Deputado Federal', sexo: 'M' }, 'camara'), 'Deputado federal');
  assert.equal(rotuloCargoAutor({ cargo_atual: 'Deputado Federal', sexo: 'F' }, 'camara'), 'Deputada federal');
  assert.equal(rotuloCargoAutor({ cargo_atual: 'Deputado Estadual', sexo: 'F' }, 'rs'), 'Deputada estadual');
  assert.equal(rotuloCargoAutor({ cargo_atual: 'Senador(a)', sexo: 'M' }, 'senado'), 'Senador');
});

test('sem perfil, o rótulo vem da casa; no Senado não inventa', () => {
  assert.equal(rotuloCargoAutor(null, 'camara'), 'Deputado federal');
  assert.equal(rotuloCargoAutor(null, 'rs'), 'Deputado estadual');
  assert.equal(rotuloCargoAutor(null, 'senado'), null);
});

test('só liga ao perfil quando há exatamente um candidato com slug', () => {
  assert.equal(escolherPerfilUnico([{ slug: 'a' }]).slug, 'a');
  assert.equal(escolherPerfilUnico([]), null);
  assert.equal(escolherPerfilUnico([{ slug: 'a' }, { slug: 'b' }]), null);
  assert.equal(escolherPerfilUnico([{ slug: '' }]), null);
  assert.equal(escolherPerfilUnico(null), null);
});
