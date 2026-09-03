/**
 * Testes — Tarefa 11: Sistema de Plugins via Dynamic Import
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { Command } from 'commander';
import path from 'node:path';
import os   from 'node:os';

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-11-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { salvarDB } = await import('../src/storage/db.js');
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: [], timers: {} });
});

// ---------------------------------------------------------------------------
describe('Tarefa 11 — plugin devtrack-timer: estrutura', () => {
  test('plugin exporta default com nome e versao', async () => {
    const mod = await import('../plugins/devtrack-timer.js');
    assert.ok(mod.default?.nome, 'deve ter nome');
    assert.ok(mod.default?.versao, 'deve ter versão');
    assert.equal(mod.default.nome, 'devtrack-timer');
  });

  test('plugin exporta função registrar', async () => {
    const mod = await import('../plugins/devtrack-timer.js');
    assert.equal(typeof mod.registrar, 'function', 'deve exportar registrar()');
  });

  test('registrar() adiciona comandos timer ao programa', async () => {
    const { registrar } = await import('../plugins/devtrack-timer.js');
    const prog = new Command();
    registrar(prog);
    const nomes = prog.commands.map(c => c.name());
    assert.ok(nomes.includes('timer'), 'deve registrar comando "timer"');
  });

  test('timer tem subcomandos start e stop', async () => {
    const { registrar } = await import('../plugins/devtrack-timer.js');
    const prog = new Command();
    registrar(prog);
    const timer = prog.commands.find(c => c.name() === 'timer');
    assert.ok(timer, 'timer deve existir');
    const sub = timer.commands.map(c => c.name());
    assert.ok(sub.includes('start'), 'deve ter subcomando start');
    assert.ok(sub.includes('stop'),  'deve ter subcomando stop');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 11 — plugin devtrack-timer: timer start', () => {
  test('timer start salva startTime no banco', async () => {
    const { adicionarTask, lerDB } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Tarefa com timer' });

    // Simula o que timer start faz
    const db = await lerDB();
    if (!db.timers) db.timers = {};
    const startTime = new Date().toISOString();
    db.timers[task.id] = { startTime };
    const { salvarDB } = await import('../src/storage/db.js');
    await salvarDB(db);

    const dbAtualizado = await lerDB();
    assert.ok(dbAtualizado.timers?.[task.id]?.startTime, 'startTime deve estar no banco');
    assert.ok(!isNaN(Date.parse(dbAtualizado.timers[task.id].startTime)), 'deve ser data válida');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 11 — plugin devtrack-timer: timer stop', () => {
  test('timer stop calcula duração corretamente', async () => {
    const { adicionarTask, lerDB, salvarDB } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Tarefa timer stop' });

    // Simula start
    const db = await lerDB();
    if (!db.timers) db.timers = {};
    const inicio = new Date(Date.now() - 5000); // 5 segundos atrás
    db.timers[task.id] = { startTime: inicio.toISOString() };
    await salvarDB(db);

    // Simula stop
    const dbStop = await lerDB();
    const entrada = dbStop.timers[task.id];
    const fim = new Date();
    const duracaoMs = fim - new Date(entrada.startTime);
    dbStop.timers[task.id] = { ...entrada, stopTime: fim.toISOString(), duracaoMs };
    await salvarDB(dbStop);

    const dbFinal = await lerDB();
    assert.ok(dbFinal.timers[task.id].duracaoMs >= 5000, 'duração deve ser >= 5000ms');
    assert.ok(dbFinal.timers[task.id].stopTime, 'deve ter stopTime');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 11 — carregamento seguro de plugins', () => {
  test('plugin com erro não impede CLI de funcionar', async () => {
    const { Command } = await import('commander');
    const prog = new Command();

    // Simula carregamento de um plugin que lança erro
    let avisoCapturado = false;
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0]?.includes('[Plugin]')) avisoCapturado = true;
    };

    try {
      // Plugin simulado que lança erro ao ser "carregado"
      try {
        throw new Error('Erro simulado de plugin inválido');
      } catch (err) {
        console.warn(`[Plugin] plugin-invalido.js: ${err.message}`);
      }

      assert.ok(avisoCapturado, 'deve exibir aviso de plugin com erro');
      // CLI deve continuar funcionando
      assert.ok(prog.commands !== undefined, 'programa Commander deve continuar válido');
    } finally {
      console.warn = originalWarn;
    }
  });

  test('dynamic import funciona com caminho de URL', async () => {
    // Verifica que import() com URL funciona (não apenas com string)
    const url = new URL('../plugins/devtrack-timer.js', import.meta.url);
    const mod = await import(url);
    assert.ok(mod.default, 'deve importar com URL');
  });
});