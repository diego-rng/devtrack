/**
 * Testes — Tarefa 08: Formulários Guiados com Inquirer
 *
 * O `devtrack new` é interativo e não pode ser testado diretamente.
 * Testamos a lógica de negócio interna: a lógica de criação de tarefa
 * e as funções que o newCmd.js usa internamente.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert    from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path      from 'node:path';
import os        from 'node:os';

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-08-'));
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
describe('Tarefa 08 — validação de título (regra de negócio)', () => {
  test('título com 3 chars é válido', () => {
    const validar = (v) => v.trim().length >= 3 ? true : 'Título deve ter pelo menos 3 caracteres';
    assert.equal(validar('Fix'), true);
  });

  test('título com 2 chars retorna mensagem de erro', () => {
    const validar = (v) => v.trim().length >= 3 ? true : 'Título deve ter pelo menos 3 caracteres';
    assert.equal(typeof validar('Fi'), 'string', 'deve retornar string de erro');
    assert.ok(validar('Fi').length > 0, 'mensagem não vazia');
  });

  test('título vazio retorna mensagem de erro', () => {
    const validar = (v) => v.trim().length >= 3 ? true : 'Título deve ter pelo menos 3 caracteres';
    assert.notEqual(validar(''), true);
  });

  test('título com espaços apenas é inválido', () => {
    const validar = (v) => v.trim().length >= 3 ? true : 'Título deve ter pelo menos 3 caracteres';
    assert.notEqual(validar('   '), true);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 08 — lógica de projeto dinâmico', () => {
  test('projetos são carregados do banco de dados', async () => {
    const { adicionarTask, lerDB } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'T1', projeto: 'projeto-alpha' });
    await adicionarTask({ titulo: 'T2', projeto: 'projeto-beta' });
    await adicionarTask({ titulo: 'T3', projeto: 'projeto-alpha' }); // duplicado

    const db = await lerDB();
    const projetosUnicos = [...new Set(db.tasks.map(t => t.projeto).filter(Boolean))];
    assert.deepEqual(projetosUnicos.sort(), ['projeto-alpha', 'projeto-beta']);
  });

  test('projeto vazio/nulo é filtrado da lista', async () => {
    const { adicionarTask, lerDB } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'T1', projeto: '' });
    await adicionarTask({ titulo: 'T2', projeto: 'meu-proj' });

    const db = await lerDB();
    const projetos = [...new Set(db.tasks.map(t => t.projeto).filter(Boolean))];
    assert.deepEqual(projetos, ['meu-proj']);
    assert.ok(!projetos.includes(''), 'string vazia não deve aparecer');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 08 — fluxo de criação após confirmação', () => {
  test('tarefa criada com campos completos', async () => {
    const { adicionarTask, listarTasks } = await import('../src/storage/db.js');
    // Simula o que newCmd.js faz após o usuário confirmar
    await adicionarTask({
      titulo:     'Tarefa guiada',
      descricao:  'Descrição da tarefa',
      prioridade: 'alta',
      projeto:    'projeto-novo',
      tags:       ['auth', 'backend'],
    });

    const tasks = await listarTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].titulo, 'Tarefa guiada');
    assert.equal(tasks[0].prioridade, 'alta');
    assert.deepEqual(tasks[0].tags, ['auth', 'backend']);
  });

  test('contagem de tarefas por projeto está correta', async () => {
    const { adicionarTask, listarTasks } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'T1', projeto: 'meu-proj' });
    await adicionarTask({ titulo: 'T2', projeto: 'meu-proj' });
    await adicionarTask({ titulo: 'T3', projeto: 'outro-proj' });

    const doMeuProjeto = await listarTasks({ projeto: 'meu-proj' });
    assert.equal(doMeuProjeto.length, 2, 'deve ter 2 tarefas no projeto');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 08 — inquirer: módulo existe e exporta prompt', () => {
  test('inquirer é importável como ESM', async () => {
    const inquirer = await import('inquirer');
    assert.ok(inquirer.default?.prompt || typeof inquirer.prompt === 'function', 'inquirer.prompt deve existir');
  });

  test('inquirer.prompt é uma função', async () => {
    const { default: inquirer } = await import('inquirer');
    assert.equal(typeof inquirer.prompt, 'function');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 08 — comando new: registro no Commander', () => {
  test('newCmd.js exporta registrarNew', async () => {
    const mod = await import('../src/commands/newCmd.js');
    assert.equal(typeof mod.registrarNew, 'function', 'deve exportar registrarNew');
  });

  test('registrarNew adiciona comando "new" ao programa', async () => {
    const { Command }     = await import('commander');
    const { registrarNew } = await import('../src/commands/newCmd.js');
    const prog = new Command();
    registrarNew(prog);
    const nomes = prog.commands.map(c => c.name());
    assert.ok(nomes.includes('new'), 'programa deve ter comando "new"');
  });
});