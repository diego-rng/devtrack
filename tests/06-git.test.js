import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { slugify, parseStatusPorcelain } = await import('../src/services/git.js');

const getGit = () => import('../src/services/git.js');

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-git-test-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  delete process.env.DEVTRACK_EXEC_MOCK;
  rmSync(tmpDir, { recursive: true, force: true });
});

const mockExec = (stdout = '', shouldFail = false) => {
  process.env.DEVTRACK_EXEC_MOCK = JSON.stringify({ stdout, shouldFail });
};

describe('Tarefa 06 — slugify(titulo)', () => {
  test('converte espaços em hífens e lowercases', () => {
    assert.equal(slugify('Fix Login Bug'), 'fix-login-bug');
  });

  test('remove caracteres especiais', () => {
    assert.equal(slugify('Implementar OAuth 2.0!'), 'implementar-oauth-20');
  });

  test('resultado nunca ultrapassa 30 caracteres', () => {
    const longo = 'A'.repeat(50) + ' extra';
    assert.ok(slugify(longo).length <= 30);
  });

  test('espaços múltiplos colapsam em único hífen', () => {
    assert.equal(slugify('Fix   bug   aqui'), 'fix-bug-aqui');
  });

  test('string já em lowercase permanece igual (sem chars especiais)', () => {
    assert.equal(slugify('fix-bug'), 'fix-bug');
  });
});

describe('Tarefa 06 — parseStatusPorcelain(linha)', () => {
  test('arquivo modificado: M + caminho', () => {
    const r = parseStatusPorcelain('M  src/index.js');
    assert.equal(r.status, 'M');
    assert.equal(r.arquivo, 'src/index.js');
  });

  test('arquivo não rastreado: ? + caminho', () => {
    const r = parseStatusPorcelain('?? novo.txt');
    assert.equal(r.status, '?');
    assert.equal(r.arquivo, 'novo.txt');
  });

  test('arquivo adicionado: A + caminho', () => {
    const r = parseStatusPorcelain('A  file.js');
    assert.equal(r.status, 'A');
    assert.equal(r.arquivo, 'file.js');
  });

  test('arquivo deletado: D + caminho', () => {
    const r = parseStatusPorcelain('D  old.js');
    assert.equal(r.status, 'D');
    assert.equal(r.arquivo, 'old.js');
  });
});

describe('Tarefa 06 — getBranch()', () => {
  test('retorna null quando execAsync lança erro (não é repo git)', async () => {
    mockExec('', true);
    const { getBranch } = await getGit();
    assert.equal(await getBranch(), null);
  });

  test('retorna string da branch (trimmed) em sucesso', async () => {
    mockExec('main\n');
    const { getBranch } = await getGit();
    assert.equal(await getBranch(), 'main');
  });

  test('retorna null quando stdout está vazio (HEAD detached)', async () => {
    mockExec('');
    const { getBranch } = await getGit();
    assert.equal(await getBranch(), null);
  });
});

describe('Tarefa 06 — getUltimoCommit()', () => {
  test('retorna null quando execAsync lança erro', async () => {
    mockExec('', true);
    const { getUltimoCommit } = await getGit();
    assert.equal(await getUltimoCommit(), null);
  });

  test('retorna null quando stdout está vazio', async () => {
    mockExec('');
    const { getUltimoCommit } = await getGit();
    assert.equal(await getUltimoCommit(), null);
  });

  test('retorna objeto com hash, mensagem, autor, data em sucesso', async () => {
    mockExec('abc1234|Fix login|João Silva|2024-01-15 10:00:00 -0300\n');
    const { getUltimoCommit } = await getGit();
    const commit = await getUltimoCommit();
    assert.ok(commit);
    assert.equal(commit.hash, 'abc1234');
    assert.equal(commit.mensagem, 'Fix login');
    assert.equal(commit.autor, 'João Silva');
    assert.ok(commit.data);
  });
});

describe('Tarefa 06 — getStatusArquivos()', () => {
  test('retorna [] quando execAsync lança erro', async () => {
    mockExec('', true);
    const { getStatusArquivos } = await getGit();
    assert.deepEqual(await getStatusArquivos(), []);
  });

  test('retorna [] quando stdout está vazio (sem mudanças)', async () => {
    mockExec('');
    const { getStatusArquivos } = await getGit();
    assert.deepEqual(await getStatusArquivos(), []);
  });

  test('retorna array parseado quando há arquivos modificados', async () => {
    mockExec('M  src/index.js\n?? novo.txt\n');
    const { getStatusArquivos } = await getGit();
    const arquivos = await getStatusArquivos();
    assert.equal(arquivos.length, 2);
    assert.equal(arquivos[0].status, 'M');
    assert.equal(arquivos[0].arquivo, 'src/index.js');
    assert.equal(arquivos[1].status, '?');
    assert.equal(arquivos[1].arquivo, 'novo.txt');
  });
});

describe('Tarefa 06 — criarBranchDaTarefa(id, titulo)', () => {
  before(async () => {
    const { salvarDB } = await import('../src/storage/db.js');
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
  });

  test('nome da branch segue formato feat/DT-{id8}-{slug}', async () => {
    mockExec('Switched to a new branch\n');
    const { adicionarTask } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Fix login bug' });

    const { criarBranchDaTarefa } = await getGit();
    const branchName = await criarBranchDaTarefa(task.id, task.titulo);

    const id8 = task.id.slice(0, 8);
    assert.ok(branchName.startsWith(`feat/DT-${id8}-`));
    assert.ok(branchName.includes('fix-login-bug'));
  });

  test('lança Error quando git checkout -b falha', async () => {
    mockExec('', true);
    const { adicionarTask } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Outra tarefa' });

    const { criarBranchDaTarefa } = await getGit();
    await assert.rejects(() => criarBranchDaTarefa(task.id, task.titulo), Error);
  });
});
