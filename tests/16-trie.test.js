import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let tmpDir, dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-16-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { salvarDB, invalidarCache } = await import('../src/storage/db.js');
  invalidarCache();
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
});

// ---------------------------------------------------------------------------
describe('Tarefa 16 — Trie: estrutura de nós', () => {
  test('TrieNode tem filhos como Map', async () => {
    const { TrieNode } = await import('../src/structures/Trie.js');
    const node = new TrieNode();
    assert.ok(node.filhos instanceof Map, 'filhos deve ser Map');
  });

  test('TrieNode tem fimDaChave boolean', async () => {
    const { TrieNode } = await import('../src/structures/Trie.js');
    const node = new TrieNode();
    assert.equal(typeof node.fimDaChave, 'boolean');
  });

  test('TrieNode tem campo taskId', async () => {
    const { TrieNode } = await import('../src/structures/Trie.js');
    const node = new TrieNode();
    assert.ok('taskId' in node, 'deve ter campo taskId');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 16 — Trie: operações básicas', () => {
  test('inserir e buscarPrefixo exato retorna resultado', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('fix login', 'id-1');
    const r = t.buscarPrefixo('fix');
    assert.ok(r.length >= 1, 'deve retornar pelo menos 1 resultado');
    assert.ok(r.some(i => i.taskId === 'id-1'));
  });

  test('buscarPrefixo vazio retorna todos os itens inseridos', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('fix login', 'id-1');
    t.inserir('add feature', 'id-2');
    t.inserir('update docs', 'id-3');
    const r = t.buscarPrefixo('');
    assert.equal(r.length, 3);
  });

  test('buscarPrefixo sem match retorna []', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('fix login', 'id-1');
    assert.deepEqual(t.buscarPrefixo('xyz'), []);
  });

  test('normalização: "FIX Login" é encontrado por prefixo "fix"', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('FIX Login', 'id-1');
    const r = t.buscarPrefixo('fix');
    assert.ok(r.some(i => i.taskId === 'id-1'), 'deve normalizar para lowercase');
  });

  test('remover: palavra removida não aparece em buscas', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('fix login', 'id-1');
    t.inserir('fix auth', 'id-2');
    t.remover('fix login');
    const r = t.buscarPrefixo('fix');
    assert.ok(!r.some(i => i.taskId === 'id-1'), 'id-1 não deve aparecer após remoção');
    assert.ok(r.some(i => i.taskId === 'id-2'), 'id-2 deve continuar presente');
  });

  test('resultado tem formato [{ palavra, taskId }]', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    t.inserir('fix bug', 'id-1');
    const r = t.buscarPrefixo('fix');
    assert.ok(r.length > 0);
    assert.ok('palavra' in r[0], 'item deve ter campo palavra');
    assert.ok('taskId' in r[0], 'item deve ter campo taskId');
  });

  test('#raiz é privado — não acessível externamente', async () => {
    const { Trie } = await import('../src/structures/Trie.js');
    const t = new Trie();
    assert.equal(t.raiz, undefined, '#raiz não deve ser público');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 16 — Trie: integração com db.js', () => {
  test('adicionarTask insere título na Trie global', async () => {
    const { adicionarTask, getTrie } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'Fix authentication bug' });
    const trie = getTrie();
    const r = trie.buscarPrefixo('fix');
    assert.ok(r.length >= 1, 'Trie deve conter a tarefa recém adicionada');
  });

  test('removerTask remove título da Trie global', async () => {
    const { adicionarTask, removerTask, getTrie } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Remove me from trie' });
    await removerTask(task.id);
    const trie = getTrie();
    const r = trie.buscarPrefixo('remove');
    assert.ok(!r.some(i => i.taskId === task.id), 'tarefa deve ser removida da Trie');
  });
});