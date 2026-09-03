/**
 * Testes — Tarefa 07: CLI com Commander.js e Chalk
 *
 * Estratégia: importamos cada módulo de comando e inspecionamos o programa Commander
 * resultante, ou executamos o CLI como subprocess para validar saídas reais.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert    from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import path      from 'node:path';
import os        from 'node:os';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const CLI       = path.join(ROOT, 'cli.js');

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-07-'));
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

/**
 * Executa o CLI como subprocess e retorna { stdout, stderr, code }.
 */
function runCLI(args, env = {}) {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI, ...args], {
      env: { ...process.env, ...env, DEVTRACK_DB_PATH: dbPath },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => resolve({ stdout, stderr, code }));
  });
}

// ---------------------------------------------------------------------------
describe('Tarefa 07 — comando add', () => {
  test('cria tarefa com título e persiste no banco', async () => {
    const { stdout, code } = await runCLI(['add', 'Nova tarefa']);
    assert.equal(code, 0, 'exit code 0');
    assert.ok(stdout.includes('Tarefa criada'), 'mensagem de sucesso');
  });

  test('aceita -p / --prioridade', async () => {
    await runCLI(['add', 'Tarefa alta', '-p', 'alta']);
    const { listarTasks, invalidarCache } = await import('../src/storage/db.js');
    invalidarCache();
    const tasks = await listarTasks({ prioridade: 'alta' });
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].titulo, 'Tarefa alta');
  });

  test('aceita -P / --projeto', async () => {
    await runCLI(['add', 'Tarefa proj', '-P', 'meu-proj']);
    const { listarTasks, invalidarCache } = await import('../src/storage/db.js');
    invalidarCache();
    const tasks = await listarTasks({ projeto: 'meu-proj' });
    assert.equal(tasks.length, 1);
  });

  test('aceita -t / --tags (variadic)', async () => {
    await runCLI(['add', 'Tarefa tags', '-t', 'auth', 'backend']);
    const { listarTasks, invalidarCache } = await import('../src/storage/db.js');
    invalidarCache();
    const tasks = await listarTasks();
    assert.ok(tasks[0].tags.includes('auth'), 'deve ter tag auth');
    assert.ok(tasks[0].tags.includes('backend'), 'deve ter tag backend');
  });

  test('aceita -d / --descricao', async () => {
    await runCLI(['add', 'Tarefa desc', '-d', 'Minha descrição']);
    const { listarTasks, invalidarCache } = await import('../src/storage/db.js');
    invalidarCache();
    const tasks = await listarTasks();
    assert.equal(tasks[0].descricao, 'Minha descrição');
  });

  test('--help retorna saída sem erro', async () => {
    const { stdout, code } = await runCLI(['add', '--help']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('--prioridade') || stdout.includes('-p'), 'opção prioridade no help');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 07 — comando list', () => {
  // Repopula após o beforeEach do pai que limpa o banco
  beforeEach(async () => {
    const { salvarDB, adicionarTask } = await import('../src/storage/db.js');
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    await adicionarTask({ titulo: 'T1', status: 'pendente',    prioridade: 'alta',  projeto: 'p1' });
    await adicionarTask({ titulo: 'T2', status: 'concluida',   prioridade: 'media', projeto: 'p1' });
    await adicionarTask({ titulo: 'T3', status: 'em_progresso', prioridade: 'baixa', projeto: 'p2' });
  });

  test('lista sem filtro retorna todas as tarefas', async () => {
    const { stdout, code } = await runCLI(['list']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('T1') && stdout.includes('T2') && stdout.includes('T3'));
  });

  test('--status filtra corretamente', async () => {
    const { stdout, code } = await runCLI(['list', '--status', 'pendente']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('T1'), 'deve conter T1');
    assert.ok(!stdout.includes('T2'), 'não deve conter T2 (concluida)');
  });

  test('--json emite JSON válido', async () => {
    const { stdout, code } = await runCLI(['list', '--json']);
    assert.equal(code, 0);
    const parsed = JSON.parse(stdout);
    assert.ok(Array.isArray(parsed), 'deve ser array JSON');
    assert.equal(parsed.length, 3);
  });

  test('--json pode ser parseado por pipe (sem cor ANSI)', async () => {
    const { stdout } = await runCLI(['list', '--json']);
    assert.doesNotThrow(() => JSON.parse(stdout), 'deve ser JSON puro sem ANSI');
  });

  test('--prioridade filtra por prioridade', async () => {
    const { stdout } = await runCLI(['list', '--prioridade', 'alta']);
    assert.ok(stdout.includes('T1'));
    assert.ok(!stdout.includes('T2'));
  });

  test('--projeto filtra por projeto', async () => {
    const { stdout } = await runCLI(['list', '--projeto', 'p2']);
    assert.ok(stdout.includes('T3'));
    assert.ok(!stdout.includes('T1'));
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 07 — comando update', () => {
  test('atualiza status de uma tarefa', async () => {
    const { adicionarTask, lerDB, invalidarCache } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Para atualizar' });

    const { stdout, code } = await runCLI(['update', task.id, '--status', 'concluida']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('atualizada') || stdout.includes('Tarefa'));

    invalidarCache();
    const db = await lerDB();
    const atualizada = db.tasks.find(t => t.id === task.id);
    assert.equal(atualizada.status, 'concluida');
  });

  test('retorna exit code 1 para id inválido', async () => {
    const { code } = await runCLI(['update', 'id-invalido-xxx', '--status', 'concluida']);
    assert.equal(code, 1, 'deve falhar com código 1');
  });

  test('retorna exit code 1 quando nenhum campo fornecido', async () => {
    const { code } = await runCLI(['update', 'qualquer-id']);
    assert.equal(code, 1, 'deve falhar sem campos');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 07 — comando remove', () => {
  test('remove tarefa existente', async () => {
    const { adicionarTask, lerDB, invalidarCache } = await import('../src/storage/db.js');
    const task = await adicionarTask({ titulo: 'Para remover' });

    const { code } = await runCLI(['remove', task.id]);
    assert.equal(code, 0);

    invalidarCache();
    const db = await lerDB();
    assert.ok(!db.tasks.find(t => t.id === task.id), 'tarefa não deve mais existir');
  });

  test('retorna exit code 1 para id inválido', async () => {
    const { code } = await runCLI(['remove', 'id-que-nao-existe']);
    assert.equal(code, 1);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 07 — --help global e subcomandos', () => {
  test('--help lista todos os subcomandos', async () => {
    const { stdout, code } = await runCLI(['--help']);
    assert.equal(code, 0);
    const comandosEsperados = ['add', 'list', 'update', 'remove', 'export', 'github', 'git', 'serve'];
    for (const cmd of comandosEsperados) {
      assert.ok(stdout.includes(cmd), `deve listar o comando "${cmd}"`);
    }
  });

  test('-V retorna versão', async () => {
    const { stdout, code } = await runCLI(['-V']);
    assert.equal(code, 0);
    assert.match(stdout.trim(), /\d+\.\d+\.\d+/, 'deve retornar semver');
  });
});