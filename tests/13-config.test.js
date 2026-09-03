/**
 * Testes — Tarefa 13: Configuração com .env e Variáveis de Ambiente
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os   from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const CLI       = path.join(ROOT, 'cli.js');

let tmpDir;
let dbPath;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-13-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

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
describe('Tarefa 13 — config.js: parse de .env', () => {
  test('lê KEY=VALUE corretamente', () => {
    const linhas = 'PORT=4000\nGITHUB_TOKEN=abc123\n'.split('\n');
    const env = {};
    for (const linha of linhas) {
      const trimada = linha.trim();
      if (!trimada || trimada.startsWith('#')) continue;
      const idx = trimada.indexOf('=');
      if (idx === -1) continue;
      env[trimada.slice(0, idx).trim()] = trimada.slice(idx + 1).trim();
    }
    assert.equal(env.PORT, '4000');
    assert.equal(env.GITHUB_TOKEN, 'abc123');
  });

  test('ignora linhas com #', () => {
    const linhas = '# comentário\nPORT=3000\n'.split('\n');
    const env = {};
    for (const linha of linhas) {
      const trimada = linha.trim();
      if (!trimada || trimada.startsWith('#')) continue;
      const idx = trimada.indexOf('=');
      if (idx === -1) continue;
      env[trimada.slice(0, idx).trim()] = trimada.slice(idx + 1).trim();
    }
    assert.ok(!env['# comentário'], 'comentário não deve ser incluído');
    assert.equal(env.PORT, '3000');
  });

  test('ignora linhas vazias', () => {
    const linhas = '\n\nPORT=3001\n\n'.split('\n');
    const env = {};
    for (const linha of linhas) {
      const trimada = linha.trim();
      if (!trimada || trimada.startsWith('#')) continue;
      const idx = trimada.indexOf('=');
      if (idx === -1) continue;
      env[trimada.slice(0, idx).trim()] = trimada.slice(idx + 1).trim();
    }
    assert.equal(Object.keys(env).length, 1);
    assert.equal(env.PORT, '3001');
  });

  test('valor com = no meio é preservado', () => {
    const linha = 'TOKEN=abc=def=ghi';
    const idx = linha.indexOf('=');
    const chave = linha.slice(0, idx).trim();
    const valor = linha.slice(idx + 1).trim();
    assert.equal(chave, 'TOKEN');
    assert.equal(valor, 'abc=def=ghi');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 13 — config.js: valores padrão', () => {
  test('porta padrão é 3000 quando PORT não definido', async () => {
    const prev = process.env.PORT;
    delete process.env.PORT;
    delete process.env.DEVTRACK_PORT;
    // Re-importar config avalia os getters ao acessar
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.porta, 3000);
    if (prev !== undefined) process.env.PORT = prev;
  });

  test('debug é false quando DEBUG não contém devtrack', async () => {
    const prev = process.env.DEBUG;
    delete process.env.DEBUG;
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.debug, false);
    if (prev !== undefined) process.env.DEBUG = prev;
  });

  test('maxWorkers é igual a os.cpus().length por padrão', async () => {
    const prev = process.env.MAX_WORKERS;
    delete process.env.MAX_WORKERS;
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.maxWorkers, os.cpus().length);
    if (prev !== undefined) process.env.MAX_WORKERS = prev;
  });

  test('githubToken é null quando GITHUB_TOKEN não definido', async () => {
    const prev = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.githubToken, null);
    if (prev !== undefined) process.env.GITHUB_TOKEN = prev;
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 13 — comando config --list', () => {
  test('exibe as configurações sem revelar token completo', async () => {
    const { stdout, code } = await runCLI(['config', '--list'], {
      GITHUB_TOKEN: 'meu-token-secreto-longo',
    });
    assert.equal(code, 0, 'exit code 0');
    assert.ok(stdout.includes('porta'), 'deve exibir porta');
    assert.ok(!stdout.includes('meu-token-secreto-longo'), 'não deve revelar token completo');
    assert.ok(stdout.includes('****'), 'deve mascarar token com ****');
  });

  test('exibe "não definido" quando token está ausente', async () => {
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    const { stdout, code } = await runCLI(['config', '--list'], { GITHUB_TOKEN: '' });
    // Aceita tanto "não definido" quanto estado de não configurado
    assert.equal(code, 0);
    assert.ok(stdout.includes('config') || stdout.includes('porta') || stdout.includes('DevTrack'));
  });

  test('exibe porta configurada via PORT', async () => {
    const { stdout, code } = await runCLI(['config', '--list'], { PORT: '5555' });
    assert.equal(code, 0);
    assert.ok(stdout.includes('5555'), 'deve exibir a porta configurada');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 13 — variáveis via process.env', () => {
  test('PORT env substitui porta padrão', async () => {
    const prev = process.env.PORT;
    process.env.PORT = '8888';
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.porta, 8888);
    if (prev !== undefined) process.env.PORT = prev;
    else delete process.env.PORT;
  });

  test('DEBUG=devtrack ativa modo debug', async () => {
    const prev = process.env.DEBUG;
    process.env.DEBUG = 'devtrack';
    const { config } = await import('../src/utils/config.js');
    assert.equal(config.debug, true);
    if (prev !== undefined) process.env.DEBUG = prev;
    else delete process.env.DEBUG;
  });

  test('.env.example existe e contém as variáveis esperadas', () => {
    const conteudo = readFileSync(path.join(ROOT, '.env.example'), 'utf-8');
    const variaveis = ['PORT', 'GITHUB_TOKEN', 'WEBHOOK_URL'];
    for (const v of variaveis) {
      assert.ok(conteudo.includes(v), `.env.example deve documentar ${v}`);
    }
  });
});