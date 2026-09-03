import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLI  = path.join(ROOT, 'cli.js');

let tmpDir, dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-14-'));
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

function runCLI(args, env = {}) {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI, ...args], {
      env: { ...process.env, ...env, DEVTRACK_DB_PATH: dbPath },
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => resolve({ stdout, stderr, code }));
  });
}

// ---------------------------------------------------------------------------
describe('Tarefa 14 — Stack: estrutura', () => {
  test('push e pop seguem ordem LIFO', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    s.push(1); s.push(2); s.push(3);
    assert.equal(s.pop(), 3);
    assert.equal(s.pop(), 2);
    assert.equal(s.pop(), 1);
  });

  test('pop em stack vazia retorna undefined', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    assert.equal(s.pop(), undefined);
  });

  test('peek retorna topo sem remover', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    s.push('a'); s.push('b');
    assert.equal(s.peek(), 'b');
    assert.equal(s.size, 2);
  });

  test('isEmpty retorna true em stack vazia', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    assert.equal(s.isEmpty(), true);
    s.push(1);
    assert.equal(s.isEmpty(), false);
  });

  test('size incrementa e decrementa corretamente', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    assert.equal(s.size, 0);
    s.push('x'); s.push('y');
    assert.equal(s.size, 2);
    s.pop();
    assert.equal(s.size, 1);
  });

  test('clear esvazia a stack', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    s.push(1); s.push(2);
    s.clear();
    assert.equal(s.isEmpty(), true);
    assert.equal(s.size, 0);
  });

  test('toArray retorna items na ordem de inserção (base→topo)', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    s.push('a'); s.push('b'); s.push('c');
    assert.deepEqual(s.toArray(), ['a', 'b', 'c']);
  });

  test('#items é privado — não acessível externamente', async () => {
    const { Stack } = await import('../src/structures/Stack.js');
    const s = new Stack();
    assert.equal(s.items, undefined, '#items não deve ser público');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 14 — history.js: registrar e desfazer', () => {
  test('registrar empilha na undoStack', async () => {
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();
    h.registrar('add', JSON.stringify([]));
    assert.equal(h.undoSize(), 1);
  });

  test('desfazer restaura estado anterior no banco', async () => {
    const { adicionarTask, listarTasks, invalidarCache } = await import('../src/storage/db.js');
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();

    const snapshot = JSON.stringify((await import('../src/storage/db.js').then(m => m.lerDB()))?.tasks ?? []);
    await adicionarTask({ titulo: 'Para desfazer' });
    h.registrar('add', snapshot);

    await h.desfazer();
    invalidarCache();
    const tasks = await listarTasks();
    assert.equal(tasks.length, 0, 'undo deve restaurar banco vazio');
  });

  test('desfazer sem histórico retorna mensagem "Nada para desfazer"', async () => {
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();
    const msg = await h.desfazer();
    assert.ok(msg?.includes('Nada'), `esperado mensagem, recebido: ${msg}`);
  });

  test('refazer após desfazer restaura estado', async () => {
    const { adicionarTask, listarTasks, invalidarCache } = await import('../src/storage/db.js');
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();

    const snap0 = JSON.stringify([]);
    const task = await adicionarTask({ titulo: 'Refazer' });
    const snap1 = JSON.stringify([task]);
    h.registrar('add', snap0);

    await h.desfazer();
    invalidarCache();
    assert.equal((await listarTasks()).length, 0);

    h.registrarRedo(snap1);
    await h.refazer();
    invalidarCache();
    assert.equal((await listarTasks()).length, 1);
  });

  test('limite de 50 entradas: ao ultrapassar, descarta a mais antiga', async () => {
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();
    for (let i = 0; i < 55; i++) h.registrar('op', JSON.stringify([]));
    assert.ok(h.undoSize() <= 50, `undoSize deve ser <= 50, foi ${h.undoSize()}`);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 14 — CLI: undo e redo', () => {
  test('devtrack undo sem histórico retorna exit 0 com mensagem amigável', async () => {
    const { stdout, code } = await runCLI(['undo']);
    assert.equal(code, 0);
    assert.ok(stdout.toLowerCase().includes('nada') || stdout.toLowerCase().includes('histórico') || stdout.toLowerCase().includes('desfazer'));
  });

  test('devtrack undo após add remove a tarefa do banco (via history API)', async () => {
    // O history é em memória — testamos via API direta (não subprocess separado)
    const { adicionarTask, listarTasks, invalidarCache, lerDB } = await import('../src/storage/db.js');
    const { createHistory } = await import('../src/services/history.js');
    const h = createHistory();

    const db = await lerDB();
    const snapshot = JSON.stringify(db.tasks);
    await adicionarTask({ titulo: 'Tarefa undo CLI' });
    h.registrar('add', snapshot);

    await h.desfazer();
    invalidarCache();
    const tasks = await listarTasks();
    assert.equal(tasks.length, 0, 'tarefa deve ter sido removida pelo undo');
  });
});