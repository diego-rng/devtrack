import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
describe('Tarefa 19 — MinHeap: estrutura', () => {
  test('insert e extractMin retornam em ordem crescente de prioridade', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    h.insert('C', 3); h.insert('A', 1); h.insert('B', 2);
    assert.equal(h.extractMin().item, 'A');
    assert.equal(h.extractMin().item, 'B');
    assert.equal(h.extractMin().item, 'C');
  });

  test('peek retorna mínimo sem remover', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    h.insert('X', 5); h.insert('Y', 1);
    const min = h.peek();
    assert.equal(min.item, 'Y');
    assert.equal(h.size, 2, 'peek não deve remover');
  });

  test('size contagem correta', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    assert.equal(h.size, 0);
    h.insert('a', 1); h.insert('b', 2);
    assert.equal(h.size, 2);
    h.extractMin();
    assert.equal(h.size, 1);
  });

  test('extractMin em heap vazio retorna undefined', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    assert.equal(h.extractMin(), undefined);
  });

  test('heap property mantida após 5 inserções desordenadas', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    [5, 3, 8, 1, 4].forEach((p, i) => h.insert(`item${i}`, p));
    const ordem = [];
    while (h.size > 0) ordem.push(h.extractMin().prioridade);
    for (let i = 1; i < ordem.length; i++) {
      assert.ok(ordem[i] >= ordem[i-1], `ordem[${i}]=${ordem[i]} deve ser >= ordem[${i-1}]=${ordem[i-1]}`);
    }
  });

  test('insert 1000 itens em menos de 10ms', async () => {
    const { MinHeap } = await import('../src/structures/MinHeap.js');
    const h = new MinHeap();
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) h.insert(`t${i}`, Math.random());
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 10, `inserção de 1000 itens levou ${elapsed.toFixed(2)}ms (esperado < 10ms)`);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 19 — scheduler.js: cálculo de urgência', () => {
  test('calcularScore existe e retorna número', async () => {
    const { calcularScore } = await import('../src/services/scheduler.js');
    const score = calcularScore('alta', null);
    assert.equal(typeof score, 'number');
  });

  test('prioridade alta tem score menor que baixa (mais urgente)', async () => {
    const { calcularScore } = await import('../src/services/scheduler.js');
    const scoreAlta = calcularScore('alta', null);
    const scoreBaixa = calcularScore('baixa', null);
    assert.ok(scoreAlta < scoreBaixa, `alta(${scoreAlta}) deve ser < baixa(${scoreBaixa})`);
  });

  test('tarefa baixa sem deadline tem score > alta com deadline amanhã', async () => {
    const { calcularScore } = await import('../src/services/scheduler.js');
    const amanha = new Date(Date.now() + 86400000).toISOString();
    const scoreBaixaSemDeadline = calcularScore('baixa', null);
    const scoreAltaComDeadline  = calcularScore('alta', amanha);
    assert.ok(
      scoreBaixaSemDeadline > scoreAltaComDeadline,
      `baixa/sem-deadline(${scoreBaixaSemDeadline}) deve ser > alta/amanhã(${scoreAltaComDeadline})`
    );
  });

  test('deadline mais próximo gera score menor (mais urgente)', async () => {
    const { calcularScore } = await import('../src/services/scheduler.js');
    const amanha    = new Date(Date.now() + 1 * 86400000).toISOString();
    const semanaQue = new Date(Date.now() + 7 * 86400000).toISOString();
    const scoreAmanha = calcularScore('media', amanha);
    const scoreSemana = calcularScore('media', semanaQue);
    assert.ok(scoreAmanha < scoreSemana, 'deadline mais próximo deve ser mais urgente');
  });
});