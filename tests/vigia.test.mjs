// Testes do vigia de frescor (T13). Só a função pura `avaliar`; nada de rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliar, REGRAS } from '../scripts/vigia_frescor.mjs';

const AGORA = new Date('2026-10-17T20:00:00Z');
const horas = (h) => new Date(AGORA.getTime() - h * 3.6e6).toISOString();
const regras = [
  { fonte: 'a', maxHoras: 72 },
  { fonte: 'b', maxHoras: 240, ate: '2026-11-02' },
  { fonte: 'c', maxHoras: 72, soAviso: true },
];

test('tudo em dia: nada falha', () => {
  const r = avaliar([{ fonte: 'a', coletado_em: horas(5) }, { fonte: 'b', coletado_em: horas(100) }, { fonte: 'c', coletado_em: horas(1) }], AGORA, regras);
  assert.deepEqual(r.falhas, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.ok.length, 3);
});

test('fonte atrasada além do limite falha', () => {
  const r = avaliar([{ fonte: 'a', coletado_em: horas(80) }, { fonte: 'b', coletado_em: horas(1) }, { fonte: 'c', coletado_em: horas(1) }], AGORA, regras);
  assert.equal(r.falhas.length, 1);
  assert.match(r.falhas[0], /^a: última coleta há/);
});

test('fonte ausente falha; ausente com soAviso só avisa', () => {
  const r = avaliar([{ fonte: 'b', coletado_em: horas(1) }], AGORA, regras);
  assert.equal(r.falhas.length, 1);
  assert.match(r.falhas[0], /^a: sem linha/);
  assert.match(r.avisos[0], /^c: sem linha/);
});

test('fonte com `ate` vencido deixa de ser cobrada', () => {
  const depois = new Date('2026-11-03T12:00:00Z');
  const r = avaliar([{ fonte: 'a', coletado_em: new Date(depois.getTime() - 3.6e6).toISOString() }, { fonte: 'c', coletado_em: new Date(depois.getTime() - 3.6e6).toISOString() }], depois, regras);
  assert.deepEqual(r.falhas, []);
});

test('lista vazia ou inválida (a rota devolve [] quando o banco falha) é falha', () => {
  assert.equal(avaliar([], AGORA, regras).falhas.length, 1);
  assert.equal(avaliar(null, AGORA, regras).falhas.length, 1);
});

test('várias linhas da mesma fonte: vale a mais recente', () => {
  const r = avaliar([{ fonte: 'a', escopo: 'x', coletado_em: horas(500) }, { fonte: 'a', escopo: 'y', coletado_em: horas(2) }, { fonte: 'b', coletado_em: horas(1) }, { fonte: 'c', coletado_em: horas(1) }], AGORA, regras);
  assert.deepEqual(r.falhas, []);
});

test('data inválida ou no futuro não passa em silêncio', () => {
  const r = avaliar([{ fonte: 'a', coletado_em: 'lixo' }, { fonte: 'b', coletado_em: horas(-30) }, { fonte: 'c', coletado_em: horas(1) }], AGORA, regras);
  assert.equal(r.falhas.length, 2);
});

test('fonte nova sem regra gera aviso (para lembrar de cadastrar)', () => {
  const r = avaliar([{ fonte: 'a', coletado_em: horas(1) }, { fonte: 'b', coletado_em: horas(1) }, { fonte: 'c', coletado_em: horas(1) }, { fonte: 'nova', coletado_em: horas(1) }], AGORA, regras);
  assert.match(r.avisos.join(), /nova: fonte nova sem regra/);
});

test('regras reais: sem fonte duplicada e todas com limite positivo', () => {
  const nomes = REGRAS.map((r) => r.fonte);
  assert.equal(new Set(nomes).size, nomes.length);
  for (const r of REGRAS) assert.ok(r.maxHoras > 0, r.fonte);
});

test('regras reais contra o retrato de 17/10/2026 (dia da última coleta completa): sem falhas', () => {
  const t = '2026-10-17T16:30:00Z';
  const linhas = REGRAS.filter((r) => !r.soAviso).map((r) => ({ fonte: r.fonte, coletado_em: t }));
  const r = avaliar(linhas, new Date('2026-10-17T20:00:00Z'));
  assert.deepEqual(r.falhas, []);
});
