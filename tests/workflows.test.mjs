// TESTES DOS WORKFLOWS (17/10/2026). Pegam, sem rodar nada no GitHub, os erros que fazem um job
// ser ignorado em silêncio ou falhar só na hora H. Cada teste aqui nasceu de um risco real:
//
// - `if: github.event.schedule == 'X'` compara TEXTO com o cron. Se o cron muda e o `if` não, o job
//   deixa de rodar e o GitHub mostra tudo verde (o coletor da ficha ficou assim em 2026-09).
// - Segredo com nome errado só estoura na execução. A lista abaixo é a verdade sobre quais
//   segredos existem no repositório; ao criar um novo, acrescente aqui de propósito.
// - Em 17/10/2026 o pg_dump imprimiu a senha de um banco num log PÚBLICO. O backup tem de manter a
//   máscara de senha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PASTA = join(RAIZ, '.github', 'workflows');

// Segredos que existem em Settings > Secrets and variables > Actions (conferido em 17/10/2026).
const SEGREDOS_CONHECIDOS = new Set([
  'ALERGS_PONTE_TOKEN', 'ALERGS_PONTE_URL', 'BACKUP_REPO_TOKEN', 'BANCO1_DB_URL', 'BANCO2_DB_URL',
  'PONTE_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL',
  'GITHUB_TOKEN', // automático, não é um segredo nosso
]);

const workflows = readdirSync(PASTA).filter((f) => /\.ya?ml$/.test(f)).map((nome) => ({
  nome, texto: readFileSync(join(PASTA, nome), 'utf8').replace(/\r\n/g, '\n'),
}));

const semComentario = (t) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const crons = (t) => [...semComentario(t).matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map((m) => m[1]);

// Jobs do arquivo: { nome, linhas, se } onde `se` é o texto do `if:` do job ('' se não tem).
function jobs(texto) {
  const linhas = semComentario(texto).split('\n');
  const ini = linhas.findIndex((l) => /^jobs:\s*$/.test(l));
  if (ini < 0) return [];
  const saida = [];
  let atual = null;
  for (const l of linhas.slice(ini + 1)) {
    const m = l.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (m) { atual = { nome: m[1], linhas: [] }; saida.push(atual); continue; }
    if (/^\S/.test(l)) break;
    if (atual) atual.linhas.push(l);
  }
  for (const j of saida) {
    let se = '', dentro = false;
    for (const l of j.linhas) {
      if (/^    if:/.test(l)) { dentro = true; se += l + '\n'; continue; }
      if (dentro) {
        if (/^    [A-Za-z-]+:/.test(l)) dentro = false;
        else se += l + '\n';
      }
    }
    j.se = se;
  }
  return saida;
}

test('existem workflows para testar', () => {
  assert.ok(workflows.length >= 4);
});

test('todo cron citado num `if` existe de fato em on.schedule (senão o job nunca roda)', () => {
  for (const { nome, texto } of workflows) {
    const lista = crons(texto);
    for (const j of jobs(texto)) {
      for (const m of j.se.matchAll(/github\.event\.schedule\s*==\s*'([^']+)'/g)) {
        assert.ok(lista.includes(m[1]), `${nome}, job ${j.nome}: o if cita o cron '${m[1]}', que não está em on.schedule`);
      }
    }
  }
});

test('todo cron tem ao menos um job que roda quando ele dispara (senão o horário não faz nada)', () => {
  for (const { nome, texto } of workflows) {
    for (const c of crons(texto)) {
      const js = jobs(texto);
      const roda = js.some((j) => !j.se.trim() || j.se.includes(`'${c}'`));
      assert.ok(roda, `${nome}: nenhum job roda no cron '${c}' (todos têm if que não o cita)`);
    }
  }
});

test('crons têm 5 campos', () => {
  for (const { nome, texto } of workflows) {
    for (const c of crons(texto)) assert.equal(c.trim().split(/\s+/).length, 5, `${nome}: cron inválido '${c}'`);
  }
});

test('só se usam segredos que existem no repositório (typo de nome só estouraria na execução)', () => {
  for (const { nome, texto } of workflows) {
    for (const m of semComentario(texto).matchAll(/secrets\.([A-Za-z0-9_]+)/g)) {
      assert.ok(SEGREDOS_CONHECIDOS.has(m[1]), `${nome}: segredo desconhecido '${m[1]}'. Se for novo, crie-o no GitHub e acrescente em tests/workflows.test.mjs`);
    }
  }
});

test('todo script chamado pelos workflows existe no repositório', () => {
  for (const { nome, texto } of workflows) {
    for (const m of semComentario(texto).matchAll(/node\s+(coletores\/[A-Za-z0-9_./-]+\.m?js)/g)) {
      assert.ok(existsSync(join(RAIZ, m[1])), `${nome}: chama ${m[1]}, que não existe`);
    }
  }
});

test('todo job tem teto de tempo (timeout-minutes), para rede travada não gastar horas', () => {
  for (const { nome, texto } of workflows) {
    for (const j of jobs(texto)) {
      const job = j.linhas.join('\n');
      assert.match(job, /timeout-minutes:/, `${nome}, job ${j.nome}: sem timeout-minutes (no job ou num passo)`);
    }
  }
});

test('backup: mantém a máscara de senha e não liga eco de comandos', () => {
  const b = workflows.find((w) => w.nome === 'backup.yml');
  assert.ok(b, 'backup.yml sumiu');
  const t = semComentario(b.texto);
  assert.ok((t.match(/::add-mask::/g) || []).length >= 2, 'a máscara de senha (::add-mask::) tem de estar nos dois bancos');
  assert.ok(!/set\s+-[a-z]*x/.test(t), 'set -x imprimiria comandos (e senhas) no log público');
  assert.ok(!/echo\s+"?\$\{?BANCO/.test(t), 'não imprima o endereço do banco');
  assert.match(t, /--exclude-table-data=public\.despesas_parlamentares/, 'o backup do banco 1 deve excluir as tabelas grandes recriáveis');
  assert.match(t, /age -r/, 'o backup deve sair criptografado (age)');
  assert.match(t, /jordypoldoni\/lume-backups/, 'o destino deve ser o repositório PRIVADO de backups');
});

test('qualquer passo com continue-on-error é conhecido (falha silenciosa deixa dado velho sem aviso)', () => {
  // coletar.yml usa de propósito, para uma fonte fora do ar não derrubar as outras. O custo é que o run
  // fica verde mesmo com coleta falha: quem vigia isso é o vigia de frescor (fonte_status).
  const permitido = new Set(['coletar.yml', 'coletar_fiscal.yml']);
  for (const { nome, texto } of workflows) {
    if (/^\s*continue-on-error:\s*true/m.test(semComentario(texto))) {
      assert.ok(permitido.has(nome), `${nome}: continue-on-error novo. Falha de coleta ficaria verde. Se for de propósito, acrescente em tests/workflows.test.mjs`);
    }
  }
});
