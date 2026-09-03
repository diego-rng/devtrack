import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
describe('Tarefa 15 — Queue: estrutura FIFO O(1)', () => {
  test('enqueue e dequeue seguem ordem FIFO', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    q.enqueue('a'); q.enqueue('b'); q.enqueue('c');
    assert.equal(q.dequeue(), 'a');
    assert.equal(q.dequeue(), 'b');
    assert.equal(q.dequeue(), 'c');
  });

  test('dequeue em fila vazia retorna undefined', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    assert.equal(q.dequeue(), undefined);
  });

  test('peek retorna frente sem remover', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    q.enqueue(10); q.enqueue(20);
    assert.equal(q.peek(), 10);
    assert.equal(q.size, 2);
  });

  test('isEmpty retorna true em fila vazia', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    assert.equal(q.isEmpty(), true);
    q.enqueue(1);
    assert.equal(q.isEmpty(), false);
  });

  test('size contagem correta após enqueue e dequeue', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    q.enqueue('x'); q.enqueue('y');
    assert.equal(q.size, 2);
    q.dequeue();
    assert.equal(q.size, 1);
    q.dequeue();
    assert.equal(q.size, 0);
  });

  test('implementação O(1): não usa Array internamente', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    // Verifica que a instância não tem propriedades públicas do tipo Array
    assert.ok(!Array.isArray(q['store']), '#store não deve ser array público');
    assert.ok(!Array.isArray(q['_store']), '_store não deve ser array público');
  });

  test('múltiplos enqueue e dequeue mantêm consistência', async () => {
    const { Queue } = await import('../src/structures/Queue.js');
    const q = new Queue();
    for (let i = 0; i < 100; i++) q.enqueue(i);
    for (let i = 0; i < 100; i++) {
      assert.equal(q.dequeue(), i);
    }
    assert.equal(q.isEmpty(), true);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 15 — notifier.js: fila de webhooks com retry', () => {
  test('stats() retorna estrutura correta', async () => {
    const { createNotifier } = await import('../src/services/notifier.js');
    const n = createNotifier();
    const s = n.stats();
    assert.ok('pendentes' in s, 'stats deve ter pendentes');
    assert.ok('deadLetter' in s, 'stats deve ter deadLetter');
    assert.ok('processados' in s, 'stats deve ter processados');
  });

  test('enfileirar evento aumenta contagem de pendentes', async () => {
    const { createNotifier } = await import('../src/services/notifier.js');
    const n = createNotifier();
    n.enfileirar({ tipo: 'add', payload: { id: '1' } });
    assert.equal(n.stats().pendentes, 1);
  });

  test('processar() com URL inválida incrementa tentativas', async () => {
    const { createNotifier } = await import('../src/services/notifier.js');
    const n = createNotifier('http://localhost:1'); // porta inválida
    n.enfileirar({ tipo: 'add', payload: { id: '1' } });
    await n.processar();
    // Evento deve estar de volta na fila com tentativas=1
    assert.equal(n.stats().pendentes, 1);
  });

  test('após 3 falhas, evento vai para deadLetterQueue', async () => {
    const { createNotifier } = await import('../src/services/notifier.js');
    const n = createNotifier('http://localhost:1');
    n.enfileirar({ tipo: 'add', payload: { id: '1' } });
    await n.processar(); // tentativas=1
    await n.processar(); // tentativas=2
    await n.processar(); // tentativas=3 → deadLetter
    assert.equal(n.stats().pendentes, 0);
    assert.equal(n.stats().deadLetter, 1);
  });

  test('iniciarProcessamento retorna id para cancelamento', async () => {
    const { createNotifier } = await import('../src/services/notifier.js');
    const n = createNotifier();
    const id = n.iniciarProcessamento(10000);
    assert.ok(id !== undefined, 'deve retornar intervalId');
    clearInterval(id);
  });
});