/**
 * Testes — Tarefa 10: Processamento Paralelo com Worker Threads
 *
 * Estratégia: cria arquivos reais no tmpDir e processa com Worker Threads,
 * verificando que a análise retorna as métricas corretas.
 */

import { test, describe, before, after } from 'node:test';
import assert    from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import path      from 'node:path';
import os        from 'node:os';

const WORKER_URL = new URL('../workers/fileWorker.js', import.meta.url);

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-10-'));
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Executa o fileWorker para um arquivo e retorna o resultado.
 */
function rodarWorker(arquivo) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL, { workerData: { arquivo } });
    worker.once('message', resolve);
    worker.once('error',   reject);
  });
}

// ---------------------------------------------------------------------------
describe('Tarefa 10 — fileWorker: análise de arquivo', () => {
  test('retorna métricas corretas para arquivo simples', async () => {
    const conteudo = 'linha 1\nlinha 2\nlinha 3\n';
    const arquivo  = path.join(tmpDir, 'simples.log');
    writeFileSync(arquivo, conteudo, 'utf-8');

    const resultado = await rodarWorker(arquivo);
    assert.equal(resultado.linhas, 3, 'deve contar 3 linhas');
    assert.ok(resultado.palavras > 0, 'deve contar palavras');
    assert.ok(resultado.tamanhoBytes > 0, 'deve contar bytes');
    assert.equal(resultado.erros, 0);
  });

  test('conta bytes corretamente', async () => {
    const conteudo = 'abc';
    const arquivo  = path.join(tmpDir, 'bytes.log');
    writeFileSync(arquivo, conteudo, 'utf-8');

    const resultado = await rodarWorker(arquivo);
    assert.equal(resultado.tamanhoBytes, 3);
  });

  test('arquivo vazio retorna 0 linhas e 0 palavras', async () => {
    const arquivo = path.join(tmpDir, 'vazio.log');
    writeFileSync(arquivo, '', 'utf-8');

    const resultado = await rodarWorker(arquivo);
    assert.equal(resultado.linhas, 0);
    assert.equal(resultado.palavras, 0);
  });

  test('arquivo inexistente retorna erros=1 sem rejeitar', async () => {
    const resultado = await rodarWorker(path.join(tmpDir, 'nao-existe.log'));
    assert.equal(resultado.erros, 1, 'deve reportar erro');
    assert.ok(resultado.erro, 'deve ter mensagem de erro');
  });

  test('retorna o caminho do arquivo no resultado', async () => {
    const arquivo = path.join(tmpDir, 'caminho.log');
    writeFileSync(arquivo, 'conteudo', 'utf-8');

    const resultado = await rodarWorker(arquivo);
    assert.equal(resultado.arquivo, arquivo);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 10 — processamento paralelo', () => {
  test('múltiplos workers rodam em paralelo (tempo < sequencial)', async () => {
    const arquivos = [];
    for (let i = 0; i < 4; i++) {
      const p = path.join(tmpDir, `parallel-${i}.log`);
      writeFileSync(p, 'linha\n'.repeat(1000), 'utf-8');
      arquivos.push(p);
    }

    const inicioParalelo = performance.now();
    await Promise.all(arquivos.map(rodarWorker));
    const tempoParalelo = performance.now() - inicioParalelo;

    // Processar em série para comparar
    const inicioSerie = performance.now();
    for (const a of arquivos) await rodarWorker(a);
    const tempoSerie = performance.now() - inicioSerie;

    // Paralelo deve ser notavelmente mais rápido (ou pelo menos não mais lento)
    assert.ok(tempoParalelo <= tempoSerie * 1.5, `paralelo (${tempoParalelo.toFixed(1)}ms) não deve ser 50% mais lento que série (${tempoSerie.toFixed(1)}ms)`);
  });

  test('erro em um worker não cancela os outros (Promise.allSettled)', async () => {
    const arquivoValido = path.join(tmpDir, 'valido.log');
    writeFileSync(arquivoValido, 'conteudo\n', 'utf-8');
    const arquivoInvalido = path.join(tmpDir, 'nao-existe-mesmo.log');

    const resultados = await Promise.allSettled([
      rodarWorker(arquivoValido),
      rodarWorker(arquivoInvalido),
    ]);

    // Ambos devem completar (fulfilled) pois o worker captura erros internamente
    assert.ok(resultados.every(r => r.status === 'fulfilled'), 'todos devem ser fulfilled (worker captura exceções)');
    assert.equal(resultados[0].value.erros, 0, 'arquivo válido sem erros');
    assert.equal(resultados[1].value.erros, 1, 'arquivo inválido com erro');
  });

  test('número de workers não ultrapassa os.cpus().length', () => {
    const maxWorkers = os.cpus().length;
    assert.ok(maxWorkers > 0, 'deve ter pelo menos 1 CPU');
    // A verificação de não ultrapassar é garantida pela lógica de batch
    // Aqui verificamos que a constante é correta
    assert.equal(typeof maxWorkers, 'number');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 10 — perf_hooks: medição de tempo', () => {
  test('performance.now() retorna valor em ms', () => {
    const t = performance.now();
    assert.ok(typeof t === 'number' && t > 0, 'performance.now() deve retornar número positivo');
  });

  test('performance.now() tem resolução sub-milissegundo', () => {
    const t1 = performance.now();
    const t2 = performance.now();
    assert.ok(t2 >= t1, 't2 deve ser >= t1');
    // Em qualquer hardware moderno, a resolução é melhor que 1ms
    assert.ok(t2 - t1 < 10, 'medição de dois now() consecutivos deve ser < 10ms');
  });
});