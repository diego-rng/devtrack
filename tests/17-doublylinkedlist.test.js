import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import DoublyLinkedList from '../src/structures/DoublyLinkedList.js';

// ---------------------------------------------------------------------------
describe('Tarefa 17 — DoublyLinkedList: operações de inserção e remoção', () => {
  test('pushBack e toArray retornam ordem head→tail', async () => {
    const l = new DoublyLinkedList();
    l.pushBack(1); l.pushBack(2); l.pushBack(3);
    assert.deepEqual(l.toArray(), [1, 2, 3]);
  });

  test('pushFront insere no início', async () => {
    const l = new DoublyLinkedList();
    l.pushBack(2); l.pushFront(1);
    assert.deepEqual(l.toArray(), [1, 2]);
  });

  test('popFront remove e retorna o primeiro elemento', async () => {
    const l = new DoublyLinkedList();
    l.pushBack('a'); l.pushBack('b');
    assert.equal(l.popFront(), 'a');
    assert.deepEqual(l.toArray(), ['b']);
  });

  test('popBack remove e retorna o último elemento', async () => {
    const l = new DoublyLinkedList();
    l.pushBack('x'); l.pushBack('y');
    assert.equal(l.popBack(), 'y');
    assert.deepEqual(l.toArray(), ['x']);
  });

  test('popFront em lista vazia retorna undefined', async () => {
    const l = new DoublyLinkedList();
    assert.equal(l.popFront(), undefined);
  });

  test('popBack em lista vazia retorna undefined', async () => {
    const l = new DoublyLinkedList();
    assert.equal(l.popBack(), undefined);
  });

  test('size contagem correta após pushes e pops', async () => {
    const l = new DoublyLinkedList();
    assert.equal(l.size, 0);
    l.pushBack(1); l.pushFront(0);
    assert.equal(l.size, 2);
    l.popFront();
    assert.equal(l.size, 1);
  });

  test('toArrayReverso retorna ordem tail→head', async () => {
    const l = new DoublyLinkedList();
    l.pushBack(1); l.pushBack(2); l.pushBack(3);
    assert.deepEqual(l.toReverseArray(), [3, 2, 1]);
  });

  test('buscar retorna valor que satisfaz predicado', async () => {
    const l = new DoublyLinkedList();
    l.pushBack({ id: 1, nome: 'alpha' });
    l.pushBack({ id: 2, nome: 'beta' });
    const encontrado = l.search(v => v.id === 2);
    assert.ok(encontrado !== null);
    assert.equal(encontrado.nome, 'beta');
  });

  test('buscar retorna null quando não encontrado', async () => {
    const l = new DoublyLinkedList();
    l.pushBack(1);
    assert.equal(l.search(v => v === 99), null);
  });

  test('nós têm prev e next — estrutura bidirecional verificável via buscar', async () => {
    const l = new DoublyLinkedList();
    l.pushBack('a'); l.pushBack('b'); l.pushBack('c');
    // toArray e toArrayReverso funcionando implica prev/next corretos
    assert.deepEqual(l.toArray(), ['a', 'b', 'c']);
    assert.deepEqual(l.toReverseArray(), ['c', 'b', 'a']);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 17 — DoublyLinkedList: paginar() percorre a lista sem converter para array', () => {
  test('página 1 com porPagina default (10) retorna os primeiros 10', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 25; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('página 2 com porPagina customizado retorna o intervalo correto', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 25; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(2, 10), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  test('última página parcial retorna só os itens restantes', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 25; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(3, 10), [21, 22, 23, 24, 25]);
  });

  test('página além do fim da lista retorna []', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 25; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(4, 10), []);
  });

  test('pagina 0 ou negativa é tratada como página 1', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 5; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(0, 3), l.paginate(1, 3));
    assert.deepEqual(l.paginate(-2, 3), l.paginate(1, 3));
  });

  test('porPagina 0 ou negativo é tratado como 1', async () => {
    const l = new DoublyLinkedList();
    for (let i = 1; i <= 5; i++) l.pushBack(i);
    assert.deepEqual(l.paginate(1, 0), [1]);
    assert.deepEqual(l.paginate(1, -5), [1]);
  });

  test('paginação não percorre nós além do necessário (não é toArray()+slice)', async () => {
    const l = new DoublyLinkedList();
    for (let i = 0; i < 10000; i++) l.pushBack(i);

    // Substitui toArray por uma versão instrumentada só para esta verificação —
    // se paginar() chamasse toArray() internamente, o contador subiria para 10000.
    let chamadasToArray = 0;
    const toArrayOriginal = l.toArray.bind(l);
    l.toArray = (...args) => { chamadasToArray++; return toArrayOriginal(...args); };

    const pagina1 = l.paginate(1, 5);
    assert.deepEqual(pagina1, [0, 1, 2, 3, 4]);
    assert.equal(chamadasToArray, 0, 'paginar() não deve chamar toArray() internamente');
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 17 — timeline.js: eventos por projeto', () => {
  test('adicionarEvento adiciona evento ao projeto', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    t.adicionarEvento('proj-a', { tipo: 'add', taskId: '1', descricao: 'Criada', timestamp: Date.now() });
    const eventos = t.obterEventos('proj-a');
    assert.equal(eventos.length, 1);
  });

  test('eventos são ordenados do mais recente ao mais antigo (pushFront)', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    t.adicionarEvento('proj', { tipo: 'add', taskId: '1', descricao: 'Primeiro', timestamp: 1 });
    t.adicionarEvento('proj', { tipo: 'update', taskId: '1', descricao: 'Segundo', timestamp: 2 });
    const eventos = t.obterEventos('proj');
    assert.equal(eventos[0].descricao, 'Segundo', 'mais recente deve vir primeiro');
    assert.equal(eventos[1].descricao, 'Primeiro');
  });

  test('obterEventos com limite retorna N eventos', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    for (let i = 0; i < 5; i++) {
      t.adicionarEvento('proj', { tipo: 'add', taskId: String(i), descricao: `E${i}`, timestamp: i });
    }
    const eventos = t.obterEventos('proj', 3);
    assert.equal(eventos.length, 3);
  });

  test('timelines são isoladas por projeto', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    t.adicionarEvento('proj-a', { tipo: 'add', taskId: '1', descricao: 'A', timestamp: 1 });
    t.adicionarEvento('proj-b', { tipo: 'add', taskId: '2', descricao: 'B', timestamp: 1 });
    assert.equal(t.obterEventos('proj-a').length, 1);
    assert.equal(t.obterEventos('proj-b').length, 1);
    assert.equal(t.obterEventos('proj-a')[0].descricao, 'A');
  });

  test('obterEventos de projeto inexistente retorna []', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    assert.deepEqual(t.obterEventos('nao-existe'), []);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 17 — timeline.js: obterEventosPaginados()', () => {
  test('pagina eventos corretamente (mais recente primeiro)', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    for (let i = 0; i < 12; i++) {
      t.adicionarEvento('proj', { tipo: 'add', taskId: String(i), descricao: `E${i}`, timestamp: i });
    }
    const pagina1 = t.obterEventosPaginados('proj', 1, 5);
    const pagina2 = t.obterEventosPaginados('proj', 2, 5);
    const pagina3 = t.obterEventosPaginados('proj', 3, 5);
    assert.equal(pagina1.length, 5);
    assert.equal(pagina2.length, 5);
    assert.equal(pagina3.length, 2);
    assert.equal(pagina1[0].descricao, 'E11', 'página 1 começa pelo evento mais recente (pushFront)');
  });

  test('obterEventosPaginados de projeto inexistente retorna []', async () => {
    const { createTimeline } = await import('../src/services/timeline.js');
    const t = createTimeline();
    assert.deepEqual(t.obterEventosPaginados('nao-existe', 1, 5), []);
  });
});

// ---------------------------------------------------------------------------
describe('Tarefa 17 — db.js: eventos de timeline gerados automaticamente', () => {
  let tmpDir, dbPath;

  before(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'devtrack-17-timeline-'));
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

  test('adicionarTask registra evento tipo "add" na timeline do projeto', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    const { timeline } = await import('../src/services/timeline.js');
    const projeto = `proj-add-${Date.now()}`;

    const task = await adicionarTask({ titulo: 'Fix login', projeto });
    const eventos = timeline.obterEventos(projeto);

    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].tipo, 'add');
    assert.equal(eventos[0].taskId, task.id);
  });

  test('atualizarTask (sem mudar status) registra evento tipo "update"', async () => {
    const { adicionarTask, atualizarTask } = await import('../src/storage/db.js');
    const { timeline } = await import('../src/services/timeline.js');
    const projeto = `proj-update-${Date.now()}`;

    const task = await adicionarTask({ titulo: 'Refatorar', projeto });
    await atualizarTask(task.id, { titulo: 'Refatorar módulo X' });
    const eventos = timeline.obterEventos(projeto);

    assert.equal(eventos.length, 2, 'add + update');
    assert.equal(eventos[0].tipo, 'update', 'evento mais recente é o update');
  });

  test('atualizarTask com status "concluida" registra evento tipo "done"', async () => {
    const { adicionarTask, atualizarTask } = await import('../src/storage/db.js');
    const { timeline } = await import('../src/services/timeline.js');
    const projeto = `proj-done-${Date.now()}`;

    const task = await adicionarTask({ titulo: 'Deploy', projeto });
    await atualizarTask(task.id, { status: 'concluida' });
    const eventos = timeline.obterEventos(projeto);

    assert.equal(eventos[0].tipo, 'done');
    assert.ok(eventos[0].descricao.includes('conclu'), 'descrição deve mencionar a conclusão');
  });

  test('eventos de projetos diferentes permanecem isolados', async () => {
    const { adicionarTask } = await import('../src/storage/db.js');
    const { timeline } = await import('../src/services/timeline.js');
    const projetoA = `proj-iso-a-${Date.now()}`;
    const projetoB = `proj-iso-b-${Date.now()}`;

    await adicionarTask({ titulo: 'Tarefa A', projeto: projetoA });
    await adicionarTask({ titulo: 'Tarefa B', projeto: projetoB });

    assert.equal(timeline.obterEventos(projetoA).length, 1);
    assert.equal(timeline.obterEventos(projetoB).length, 1);
  });
});