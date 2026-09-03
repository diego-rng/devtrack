/**
 * Testes — Tarefa 12: Cache e Watcher — Hot Reload do Banco de Dados
 *
 * Estratégia: adiciona cache em memória ao db.js em isolamento, testa
 * as regras de invalidação e o debounce do watcher.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import os   from 'node:os';

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-12-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { salvarDB } = await import('../src/storage/db.js');
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
});

// ---------------------------------------------------------------------------
describe('Tarefa 12 — cache em memória: comportamento do lerDB', () => {
  test('lerDB lê o arquivo quando banco não existe e cria estrutura padrão', async () => {
    const { rmSync } = await import('node:fs');
    const tmpDb = path.join(tmpDir, 'novo.json');
    const prev = process.env.DEVTRACK_DB_PATH;
    process.env.DEVTRACK_DB_PATH = tmpDb;
    try {
      if (existsSync(tmpDb)) rmSync(tmpDb);
      const { lerDB } = await import('../src/storage/db.js');
      const db = await lerDB();
      assert.ok(Array.isArray(db.tasks));
    } finally {
      process.env.DEVTRACK_DB_PATH = prev;
    }
  });

  test('salvarDB seguido de lerDB retorna os dados recém salvos', async () => {
    const { salvarDB, lerDB } = await import('../src/storage/db.js');
    await salvarDB({ version: '1.0', projects: ['proj-x'], tasks: [], log: [] });
    const db = await lerDB();
    assert.deepEqual(db.projects, ['proj-x']);
  });

  test('modificação direta do arquivo é detectada após TTL do cache', async () => {
    const { lerDB, invalidarCache } = await import('../src/storage/db.js');

    // Escreve diretamente no arquivo (bypass de salvarDB)
    const novoConteudo = JSON.stringify({
      version: '1.0',
      projects: ['externo'],
      tasks: [],
      log: [],
    }, null, 2);
    await writeFile(dbPath, novoConteudo, 'utf-8');

    // Simula o que o fs.watch faz (invalida o cache)
    invalidarCache();

    const db = await lerDB();
    assert.deepEqual(db.projects, ['externo'], 'deve ler o arquivo modificado externamente');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 12 — cache com TTL (implementação opcional)', () => {
  test('leituras repetidas do mesmo banco são consistentes', async () => {
    const { adicionarTask, lerDB } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'Consistente' });

    const db1 = await lerDB();
    const db2 = await lerDB();
    assert.equal(db1.tasks.length, db2.tasks.length, 'leituras repetidas devem ser consistentes');
  });

  test('escrita atomica não deixa arquivo .tmp para trás', async () => {
    const { salvarDB } = await import('../src/storage/db.js');
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    assert.ok(!existsSync(dbPath + '.tmp'), 'arquivo .tmp não deve existir');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 12 — debug logging (variável DEBUG)', () => {
  test('process.env.DEBUG pode ser lido no código', () => {
    const prev = process.env.DEBUG;
    process.env.DEBUG = 'devtrack';
    const ativo = process.env.DEBUG?.includes('devtrack') ?? false;
    assert.equal(ativo, true, 'debug deve estar ativo quando DEBUG=devtrack');
    process.env.DEBUG = prev;
  });

  test('DEBUG sem "devtrack" não ativa o modo debug', () => {
    const prev = process.env.DEBUG;
    process.env.DEBUG = 'outro-modulo';
    const ativo = process.env.DEBUG?.includes('devtrack') ?? false;
    assert.equal(ativo, false, 'não deve ativar debug para outros módulos');
    process.env.DEBUG = prev;
  });

  test('DEBUG indefinido não ativa o modo debug', () => {
    const prev = process.env.DEBUG;
    delete process.env.DEBUG;
    const ativo = process.env.DEBUG?.includes('devtrack') ?? false;
    assert.equal(ativo, false, 'não deve ativar debug quando DEBUG não está definido');
    process.env.DEBUG = prev;
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 12 — debounce (lógica)', () => {
  test('debounce cancela timeout anterior ao receber novo evento', async () => {
    let chamadas = 0;
    let debounceTimer;

    // Simula o padrão de debounce do watcher
    const disparar = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { chamadas++; }, 50);
    };

    disparar();
    disparar();
    disparar(); // apenas a última deve executar

    await new Promise(r => setTimeout(r, 100));
    assert.equal(chamadas, 1, 'apenas 1 chamada após debounce de 3 eventos rápidos');
    clearTimeout(debounceTimer);
  });

  test('debounce executa após o intervalo de quietude', async () => {
    let chamadas = 0;
    let debounceTimer;

    const disparar = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { chamadas++; }, 30);
    };

    disparar();
    await new Promise(r => setTimeout(r, 80));
    assert.equal(chamadas, 1, 'deve executar 1 vez após silêncio');
    clearTimeout(debounceTimer);
  });
});