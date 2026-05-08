import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const gunzipAsync = promisify(gunzip);

let tmpDir;
let dbPath;

before(async () => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-export-test-'));
  dbPath = path.join(tmpDir, 'devtrack.json');
  process.env.DEVTRACK_DB_PATH = dbPath;

  const { salvarDB, adicionarTask } = await import('../src/storage/db.js');
  await salvarDB({ version: '1.0', projects: [], tasks: [], log: ['op1', 'op2'] });
  await adicionarTask({ titulo: 'Tarefa A', status: 'pendente',  prioridade: 'alta',  projeto: 'proj1', tags: ['tag1'] });
  await adicionarTask({ titulo: 'Tarefa B', status: 'concluida', prioridade: 'media', projeto: 'proj1', tags: [] });
  await adicionarTask({ titulo: 'Tarefa C', status: 'pendente',  prioridade: 'baixa', projeto: 'proj2', tags: ['tag2', 'tag3'] });
});

after(() => {
  delete process.env.DEVTRACK_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

const getExport = () => import('../src/services/export.js');

describe('Tarefa 04 — exportarCSV(filtro, caminhoSaida)', () => {
  test('gera arquivo com header correto', async () => {
    const { exportarCSV } = await getExport();
    const out = path.join(tmpDir, 'header.csv');
    await exportarCSV({}, out);
    const conteudo = readFileSync(out, 'utf-8');
    const primeiraLinha = conteudo.split('\n')[0];
    assert.equal(primeiraLinha, 'id,titulo,status,prioridade,projeto,tags,criadaEm');
  });

  test('gera uma linha por tarefa', async () => {
    const { exportarCSV } = await getExport();
    const out = path.join(tmpDir, 'todas.csv');
    await exportarCSV({}, out);
    const linhas = readFileSync(out, 'utf-8').split('\n').filter(Boolean);
    assert.equal(linhas.length, 4, 'header + 3 tarefas = 4 linhas');
  });

  test('filtro por status exporta apenas tarefas pendentes', async () => {
    const { exportarCSV } = await getExport();
    const out = path.join(tmpDir, 'pendentes.csv');
    await exportarCSV({ status: 'pendente' }, out);
    const linhas = readFileSync(out, 'utf-8').split('\n').filter(Boolean);
    assert.equal(linhas.length, 3, 'header + 2 pendentes = 3 linhas');
  });

  test('banco vazio → apenas o header', async () => {
    const { exportarCSV } = await getExport();
    const { salvarDB } = await import('../src/storage/db.js');
    const dbVazio = path.join(tmpDir, 'vazio.json');
    const prevPath = process.env.DEVTRACK_DB_PATH;
    process.env.DEVTRACK_DB_PATH = dbVazio;
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    const out = path.join(tmpDir, 'vazio.csv');
    await exportarCSV({}, out);
    const linhas = readFileSync(out, 'utf-8').split('\n').filter(Boolean);
    assert.equal(linhas.length, 1, 'apenas o header');
    process.env.DEVTRACK_DB_PATH = prevPath;
  });

  test('campo com vírgula é escapado em aspas duplas', async () => {
    const { exportarCSV } = await getExport();
    const { adicionarTask } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'Tarefa,com,virgula' });
    const out = path.join(tmpDir, 'virgula.csv');
    await exportarCSV({}, out);
    const conteudo = readFileSync(out, 'utf-8');
    assert.ok(conteudo.includes('"Tarefa,com,virgula"'), 'campo com vírgula deve estar entre aspas');
  });

  test('aspas internas são duplicadas (RFC 4180)', async () => {
    const { exportarCSV } = await getExport();
    const { adicionarTask } = await import('../src/storage/db.js');
    await adicionarTask({ titulo: 'Tarefa "especial"' });
    const out = path.join(tmpDir, 'aspas.csv');
    await exportarCSV({}, out);
    const conteudo = readFileSync(out, 'utf-8');
    assert.ok(conteudo.includes('""especial""'), 'aspas internas devem ser duplicadas');
  });

  test('arquivo é criado no caminho especificado', async () => {
    const { exportarCSV } = await getExport();
    const out = path.join(tmpDir, 'criado.csv');
    assert.ok(!existsSync(out), 'arquivo não deve existir antes');
    await exportarCSV({}, out);
    assert.ok(existsSync(out), 'arquivo deve ser criado');
  });
});

describe('Tarefa 04 — exportarLogComprimido(caminhoSaida)', () => {
  test('cria arquivo .gz no caminho especificado', async () => {
    const { exportarLogComprimido } = await getExport();
    const out = path.join(tmpDir, 'log.gz');
    await exportarLogComprimido(out);
    assert.ok(existsSync(out), 'arquivo .gz deve ser criado');
  });

  test('arquivo .gz é válido (pode ser descomprimido)', async () => {
    const { exportarLogComprimido } = await getExport();
    const out = path.join(tmpDir, 'valido.gz');
    await exportarLogComprimido(out);
    const buffer = readFileSync(out);
    const descomprimido = await gunzipAsync(buffer);
    assert.ok(descomprimido.length > 0, '.gz deve conter dados');
  });

  test('conteúdo descomprimido é JSON válido (array)', async () => {
    const { exportarLogComprimido } = await getExport();
    const out = path.join(tmpDir, 'json.gz');
    await exportarLogComprimido(out);
    const buffer = readFileSync(out);
    const descomprimido = await gunzipAsync(buffer);
    const dados = JSON.parse(descomprimido.toString());
    assert.ok(Array.isArray(dados), 'conteúdo deve ser um array JSON');
  });

  test('funciona com log vazio', async () => {
    const { exportarLogComprimido } = await getExport();
    const { salvarDB } = await import('../src/storage/db.js');
    const dbVazio = path.join(tmpDir, 'vazio-log.json');
    const prevPath = process.env.DEVTRACK_DB_PATH;
    process.env.DEVTRACK_DB_PATH = dbVazio;
    await salvarDB({ version: '1.0', projects: [], tasks: [], log: [] });
    const out = path.join(tmpDir, 'logvazio.gz');
    await exportarLogComprimido(out);
    const buffer = readFileSync(out);
    const descomprimido = await gunzipAsync(buffer);
    const dados = JSON.parse(descomprimido.toString());
    assert.deepEqual(dados, []);
    process.env.DEVTRACK_DB_PATH = prevPath;
  });
});
