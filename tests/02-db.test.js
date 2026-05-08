import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-db-test-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

const getDB = () => import('../src/storage/db.js');

describe('Tarefa 02 — lerDB()', () => {
  test('retorna estrutura padrão se arquivo não existe', async () => {
    if (existsSync(dbPath)) rmSync(dbPath);
    const { lerDB } = await getDB();
    const db = await lerDB();
    assert.ok(Array.isArray(db.projects));
    assert.ok(Array.isArray(db.tasks));
    assert.ok(Array.isArray(db.log));
    assert.ok(db.version);
  });

  test('retorna dados existentes quando arquivo existe', async () => {
    const { salvarDB, lerDB } = await getDB();
    await salvarDB({ version: '1.0', projects: ['p1'], tasks: [], log: [] });
    const db = await lerDB();
    assert.deepEqual(db.projects, ['p1']);
  });
});

describe('Tarefa 02 — salvarDB(dados)', () => {
  test('persiste os dados corretamente', async () => {
    const { salvarDB, lerDB } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [{ id: 'abc' }], log: [] });
    const db = await lerDB();
    assert.equal(db.tasks[0].id, 'abc');
  });

  test('escrita atômica: nenhum arquivo .tmp permanece', async () => {
    const { salvarDB } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    const tmpFile = dbPath + '.tmp';
    assert.ok(!existsSync(tmpFile), 'arquivo .tmp não deve permanecer');
  });
});

describe('Tarefa 02 — adicionarTask(campos)', () => {
  beforeEach(async () => {
    const { salvarDB } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
  });

  test('retorna tarefa com id UUID v4', async () => {
    const { adicionarTask } = await getDB();
    const task = await adicionarTask({ titulo: 'Minha tarefa' });
    assert.match(task.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('retorna tarefa com criadaEm em ISO 8601', async () => {
    const { adicionarTask } = await getDB();
    const task = await adicionarTask({ titulo: 'Minha tarefa' });
    assert.ok(!isNaN(Date.parse(task.criadaEm)), 'criadaEm deve ser data válida');
  });

  test('retorna tarefa com atualizadaEm preenchido', async () => {
    const { adicionarTask } = await getDB();
    const task = await adicionarTask({ titulo: 'Tarefa' });
    assert.ok(task.atualizadaEm, 'atualizadaEm deve existir');
  });

  test('aplica defaults: status=pendente, prioridade=media, tags=[], projeto=""', async () => {
    const { adicionarTask } = await getDB();
    const task = await adicionarTask({ titulo: 'Tarefa' });
    assert.equal(task.status, 'pendente');
    assert.equal(task.prioridade, 'media');
    assert.deepEqual(task.tags, []);
    assert.equal(task.projeto, '');
  });

  test('persiste a tarefa no banco', async () => {
    const { adicionarTask, lerDB } = await getDB();
    const task = await adicionarTask({ titulo: 'Persistida' });
    const db = await lerDB();
    assert.ok(db.tasks.find(t => t.id === task.id), 'tarefa deve estar no banco');
  });
});

describe('Tarefa 02 — atualizarTask(id, campos)', () => {
  beforeEach(async () => {
    const { salvarDB } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
  });

  test('atualiza os campos passados', async () => {
    const { adicionarTask, atualizarTask, lerDB } = await getDB();
    const task = await adicionarTask({ titulo: 'Original' });
    await atualizarTask(task.id, { status: 'concluida' });
    const db = await lerDB();
    const atualizada = db.tasks.find(t => t.id === task.id);
    assert.equal(atualizada.status, 'concluida');
  });

  test('atualiza atualizadaEm', async () => {
    const { adicionarTask, atualizarTask, lerDB } = await getDB();
    const task = await adicionarTask({ titulo: 'Tarefa' });
    const antes = task.atualizadaEm;
    await new Promise(r => setTimeout(r, 5));
    await atualizarTask(task.id, { status: 'em_progresso' });
    const db = await lerDB();
    const atualizada = db.tasks.find(t => t.id === task.id);
    assert.notEqual(atualizada.atualizadaEm, antes);
  });

  test('lança Error se id não existe', async () => {
    const { atualizarTask } = await getDB();
    await assert.rejects(() => atualizarTask('id-inexistente', { status: 'concluida' }), Error);
  });
});

describe('Tarefa 02 — removerTask(id)', () => {
  beforeEach(async () => {
    const { salvarDB } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
  });

  test('remove a tarefa do banco', async () => {
    const { adicionarTask, removerTask, lerDB } = await getDB();
    const task = await adicionarTask({ titulo: 'Para remover' });
    await removerTask(task.id);
    const db = await lerDB();
    assert.ok(!db.tasks.find(t => t.id === task.id), 'tarefa não deve estar mais no banco');
  });

  test('lança Error se id não existe', async () => {
    const { removerTask } = await getDB();
    await assert.rejects(() => removerTask('id-inexistente'), Error);
  });
});

describe('Tarefa 02 — listarTasks(filtro)', () => {
  before(async () => {
    const { salvarDB, adicionarTask } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    await adicionarTask({ titulo: 'T1', status: 'pendente',    prioridade: 'alta'  });
    await adicionarTask({ titulo: 'T2', status: 'pendente',    prioridade: 'media' });
    await adicionarTask({ titulo: 'T3', status: 'concluida',   prioridade: 'alta'  });
    await adicionarTask({ titulo: 'T4', status: 'em_progresso', prioridade: 'baixa' });
  });

  test('retorna todas sem filtro', async () => {
    const { listarTasks } = await getDB();
    const tasks = await listarTasks();
    assert.equal(tasks.length, 4);
  });

  test('filtra por status', async () => {
    const { listarTasks } = await getDB();
    const tasks = await listarTasks({ status: 'pendente' });
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every(t => t.status === 'pendente'));
  });

  test('filtra por prioridade', async () => {
    const { listarTasks } = await getDB();
    const tasks = await listarTasks({ prioridade: 'alta' });
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every(t => t.prioridade === 'alta'));
  });

  test('filtra por combinação (AND)', async () => {
    const { listarTasks } = await getDB();
    const tasks = await listarTasks({ status: 'pendente', prioridade: 'alta' });
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].titulo, 'T1');
  });

  test('retorna [] se nenhuma tarefa bate', async () => {
    const { listarTasks } = await getDB();
    const tasks = await listarTasks({ status: 'concluida', prioridade: 'baixa' });
    assert.deepEqual(tasks, []);
  });
});

describe('Tarefa 02 — fazerBackup()', () => {
  test('cria arquivo devtrack-YYYY-MM-DD.json no mesmo diretório', async () => {
    const { salvarDB, fazerBackup } = await getDB();
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    const backupPath = await fazerBackup();
    assert.ok(existsSync(backupPath), 'arquivo de backup deve existir');
    const nome = path.basename(backupPath);
    assert.match(nome, /^devtrack-\d{4}-\d{2}-\d{2}\.json$/, 'nome deve seguir formato YYYY-MM-DD');
  });
});
