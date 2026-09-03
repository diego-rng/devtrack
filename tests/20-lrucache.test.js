import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
describe('Tarefa 20 — LRUCache: operações básicas', () => {
  test('set e get retornam o valor armazenado', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('k1', 'v1');
    assert.equal(c.get('k1'), 'v1');
  });

  test('get em chave inexistente retorna undefined', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    assert.equal(c.get('nao-existe'), undefined);
  });

  test('has retorna true/false corretamente', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('x', 1);
    assert.equal(c.has('x'), true);
    assert.equal(c.has('y'), false);
  });

  test('delete remove a chave', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('a', 1);
    c.delete('a');
    assert.equal(c.has('a'), false);
    assert.equal(c.get('a'), undefined);
  });

  test('size contagem correta', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    assert.equal(c.size, 0);
    c.set('a', 1); c.set('b', 2);
    assert.equal(c.size, 2);
    c.delete('a');
    assert.equal(c.size, 1);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 20 — LRUCache: evicção LRU', () => {
  test('ao atingir capacidade, evicta o menos recentemente usado', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(3);
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    c.set('d', 4); // deve evictar 'a'
    assert.equal(c.has('a'), false, 'a deve ter sido evictado');
    assert.equal(c.has('d'), true);
  });

  test('get move item para mais recente — não evicta antes de outros', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(3);
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    c.get('a'); // 'a' agora é o mais recente
    c.set('d', 4); // deve evictar 'b' (menos recente), não 'a'
    assert.equal(c.has('a'), true,  'a não deve ser evictado (foi acessado)');
    assert.equal(c.has('b'), false, 'b deve ser evictado (menos recente)');
  });

  test('capacidade 1: sempre mantém apenas 1 item', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(1);
    c.set('a', 1); c.set('b', 2);
    assert.equal(c.size, 1);
    assert.equal(c.has('a'), false);
    assert.equal(c.get('b'), 2);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 20 — LRUCache: TTL', () => {
  test('item com TTL expirado é tratado como miss (retorna undefined)', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('k', 'val', 1); // TTL 1ms
    await new Promise(r => setTimeout(r, 5));
    assert.equal(c.get('k'), undefined, 'item com TTL expirado deve retornar undefined');
  });

  test('item dentro do TTL retorna valor normalmente', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('k', 'val', 10000); // TTL 10s
    assert.equal(c.get('k'), 'val');
  });

  test('TTL expirado: has retorna false', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('k', 'val', 1);
    await new Promise(r => setTimeout(r, 5));
    assert.equal(c.has('k'), false);
  });

  test('item sem TTL explícito usa padrão de 300000ms', async () => {
    const { LRUCache } = await import('../src/structures/LRUCache.js');
    const c = new LRUCache(5);
    c.set('k', 'v'); // sem TTL
    assert.equal(c.get('k'), 'v', 'deve retornar valor com TTL padrão');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 20 — LRUCache: integração com github.js', () => {
  test('github.js exporta getCache() ou possui cache singleton', async () => {
    const mod = await import('../src/services/github.js');
    assert.ok(typeof mod.getCache === 'function' || mod.githubCache !== undefined,
      'github.js deve expor o cache para inspeção em testes');
  });

  test('segunda chamada ao mesmo repo retorna do cache', async () => {
    const _fetchOriginal = globalThis.fetch;
    let chamadas = 0;
    globalThis.fetch = async () => {
      chamadas++;
      return {
        ok: true, status: 200,
        headers: { get: () => null },
        json: async () => [],
      };
    };

    try {
      const { buscarIssues, getCache } = await import('../src/services/github.js');
      const cache = getCache();
      cache.delete('owner/repo:1'); // garante miss na primeira chamada

      await buscarIssues('owner/repo', null, 1);
      await buscarIssues('owner/repo', null, 1);
      assert.equal(chamadas, 1, 'segunda chamada deve vir do cache (fetch chamado apenas 1x)');
    } finally {
      globalThis.fetch = _fetchOriginal;
    }
  });
});