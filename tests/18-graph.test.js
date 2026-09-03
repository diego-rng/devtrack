import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
describe('Tarefa 18 — Graph: vértices e arestas', () => {
  test('addVertex cria vértice com Set vazio de vizinhos', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('A');
    const vizinhos = g.neighbors('A');
    assert.ok(vizinhos instanceof Set);
    assert.equal(vizinhos.size, 0);
  });

  test('addEdge adiciona v em neighbors(u)', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('A'); g.addVertex('B');
    g.addEdge('A', 'B');
    assert.ok(g.neighbors('A').has('B'));
  });

  test('removeEdge remove v de neighbors(u)', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('A'); g.addVertex('B');
    g.addEdge('A', 'B');
    g.removeEdge('A', 'B');
    assert.ok(!g.neighbors('A').has('B'));
  });

  test('grafo não direcionado: addEdge A→B não implica B→A', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('A'); g.addVertex('B');
    g.addEdge('A', 'B');
    assert.ok(!g.neighbors('B').has('A'), 'grafo é direcionado');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 18 — Graph: BFS', () => {
  test('bfs retorna vértices em ordem de largura', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    ['A','B','C','D'].forEach(v => g.addVertex(v));
    g.addEdge('A','B'); g.addEdge('A','C'); g.addEdge('B','D');
    const resultado = g.bfs('A');
    assert.equal(resultado[0], 'A', 'início deve ser A');
    // B e C devem aparecer antes de D
    const idxB = resultado.indexOf('B');
    const idxC = resultado.indexOf('C');
    const idxD = resultado.indexOf('D');
    assert.ok(idxB < idxD, 'B antes de D');
    assert.ok(idxC < idxD, 'C antes de D');
  });

  test('bfs em grafo de um único nó retorna [nó]', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('X');
    assert.deepEqual(g.bfs('X'), ['X']);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 18 — Graph: detecção de ciclos', () => {
  test('grafo vazio: temCiclo retorna false', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    assert.equal(g.temCiclo(), false);
  });

  test('grafo sem ciclo: temCiclo retorna false', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    ['A','B','C'].forEach(v => g.addVertex(v));
    g.addEdge('A','B'); g.addEdge('B','C');
    assert.equal(g.temCiclo(), false);
  });

  test('grafo com ciclo A→B→C→A: temCiclo retorna true', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    ['A','B','C'].forEach(v => g.addVertex(v));
    g.addEdge('A','B'); g.addEdge('B','C'); g.addEdge('C','A');
    assert.equal(g.temCiclo(), true);
  });

  test('auto-loop (A→A): temCiclo retorna true', async () => {
    const { Graph } = await import('../src/structures/Graph.js');
    const g = new Graph();
    g.addVertex('A');
    g.addEdge('A','A');
    assert.equal(g.temCiclo(), true);
  });
});