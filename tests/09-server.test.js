/**
 * Testes — Tarefa 09: Servidor HTTP Local — API REST
 *
 * Estratégia: cria o servidor em porta aleatória (0), faz fetch real,
 * verifica status codes, corpo JSON e headers.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path   from 'node:path';
import os     from 'node:os';

let tmpDir;
let dbPath;
let server;
let baseUrl;

before(async () => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-09-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;

  const { salvarDB } = await import('../src/storage/db.js');
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });

  const { criarServidor } = await import('../src/server/index.js');
  server = criarServidor();
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

after(() => {
  server.close();
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { salvarDB } = await import('../src/storage/db.js');
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — GET /health', () => {
  test('retorna 200 com { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  test('Content-Type é application/json', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — GET /tasks', () => {
  test('retorna array vazio quando banco está vazio', async () => {
    const res = await fetch(`${baseUrl}/tasks`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 0);
  });

  test('retorna todas as tarefas', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'T1', status: 'pendente' });
    await adicionarTask({ titulo: 'T2', status: 'concluida' });

    const res = await fetch(`${baseUrl}/tasks`);
    const body = await res.json();
    assert.equal(body.length, 2);
  });

  test('?status= filtra por status', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'T1', status: 'pendente' });
    await adicionarTask({ titulo: 'T2', status: 'concluida' });

    const res  = await fetch(`${baseUrl}/tasks?status=pendente`);
    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].titulo, 'T1');
  });

  test('CORS header Access-Control-Allow-Origin presente', async () => {
    const res = await fetch(`${baseUrl}/tasks`);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — POST /tasks', () => {
  test('retorna 201 com a tarefa criada', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ titulo: 'Nova via API', prioridade: 'alta' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.titulo, 'Nova via API');
    assert.ok(body.id, 'deve ter id gerado');
  });

  test('tarefa criada persiste no banco', async () => {
    await fetch(`${baseUrl}/tasks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ titulo: 'Persistida via API' }),
    });
    const { listarTasks } = await import('../src/storage/db.js');
    const tasks = await listarTasks();
    assert.ok(tasks.find(t => t.titulo === 'Persistida via API'), 'tarefa deve estar no banco');
  });

  test('body inválido retorna 400', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'não é json válido{{{',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'deve ter campo error');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — PATCH /tasks/:id', () => {
  test('atualiza tarefa existente e retorna 200', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Para atualizar' });

    const res = await fetch(`${baseUrl}/tasks/${task.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'concluida' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'concluida');
  });

  test('id inválido retorna 404 com { error }', async () => {
    const res = await fetch(`${baseUrl}/tasks/id-que-nao-existe`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'concluida' }),
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error?.includes('não encontrada') || body.error?.includes('Tarefa'), 'deve ter mensagem de erro');
  });

  test('body inválido retorna 400', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Tarefa' });
    const res = await fetch(`${baseUrl}/tasks/${task.id}`, {
      method: 'PATCH',
      body:   'invalid json{',
    });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — DELETE /tasks/:id', () => {
  test('remove tarefa existente e retorna 200', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Para deletar' });

    const res = await fetch(`${baseUrl}/tasks/${task.id}`, { method: 'DELETE' });
    assert.equal(res.status, 200);

    const { listarTasks } = await import('../src/storage/db.js');
    const tasks = await listarTasks();
    assert.ok(!tasks.find(t => t.id === task.id), 'tarefa deve ter sido removida');
  });

  test('id inválido retorna 404', async () => {
    const res = await fetch(`${baseUrl}/tasks/nao-existe-mesmo`, { method: 'DELETE' });
    assert.equal(res.status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 09 — autenticação Bearer', () => {
  let authServer;
  let authBaseUrl;
  const TOKEN = 'meu-token-secreto';

  before(async () => {
    const { criarServidor } = await import('../src/server/index.js');
    authServer = criarServidor({ token: TOKEN });
    await new Promise(resolve => authServer.listen(0, resolve));
    const { port } = authServer.address();
    authBaseUrl = `http://localhost:${port}`;
  });

  after(() => {
    authServer.close();
  });

  test('GET /tasks sem Authorization retorna 401', async () => {
    const res = await fetch(`${authBaseUrl}/tasks`);
    assert.equal(res.status, 401);
  });

  test('GET /tasks com token válido retorna 200', async () => {
    const res = await fetch(`${authBaseUrl}/tasks`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    assert.equal(res.status, 200);
  });

  test('GET /tasks com token inválido retorna 401', async () => {
    const res = await fetch(`${authBaseUrl}/tasks`, {
      headers: { 'Authorization': 'Bearer token-errado' },
    });
    assert.equal(res.status, 401);
  });

  test('GET /health não requer autenticação', async () => {
    const res = await fetch(`${authBaseUrl}/health`);
    assert.equal(res.status, 200);
  });
});