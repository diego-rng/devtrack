import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const {
  formatarLinha,
  formatarTabela,
  parseTags,
  parsePrioridade,
  validarTitulo,
} = await import('../src/utils/cli-helpers.js');

const taskBase = {
  id:         '550e8400-e29b-41d4-a716-446655440000',
  titulo:     'Corrigir bug de login',
  status:     'pendente',
  prioridade: 'alta',
  tags:       ['auth'],
  projeto:    'devtrack',
  criadaEm:  '2024-01-15T10:00:00.000Z',
};

describe('Tarefa 03 — formatarLinha(task)', () => {
  test('inclui os primeiros 8 chars do id', () => {
    const linha = formatarLinha(taskBase);
    assert.ok(linha.includes('550e8400'), 'deve conter os 8 primeiros chars do id');
  });

  test('trunca título em 30 chars', () => {
    const taskLongo = { ...taskBase, titulo: 'A'.repeat(50) };
    const linha = formatarLinha(taskLongo);
    const tituloNaLinha = linha.match(/A+/)?.[0] ?? '';
    assert.ok(tituloNaLinha.length <= 30, 'título deve ser truncado em 30');
  });

  test('inclui status', () => {
    const linha = formatarLinha(taskBase);
    assert.ok(linha.includes('pendente'), 'deve incluir o status');
  });

  test('inclui prioridade', () => {
    const linha = formatarLinha(taskBase);
    assert.ok(linha.includes('alta'), 'deve incluir a prioridade');
  });
});

describe('Tarefa 03 — formatarTabela(tasks)', () => {
  test('retorna "Nenhuma tarefa." para array vazio', () => {
    assert.equal(formatarTabela([]), 'Nenhuma tarefa.');
  });

  test('contém cabeçalho com ID', () => {
    const tabela = formatarTabela([taskBase]);
    assert.ok(tabela.toLowerCase().includes('id'), 'deve ter coluna ID no cabeçalho');
  });

  test('contém separador horizontal', () => {
    const tabela = formatarTabela([taskBase]);
    assert.ok(tabela.includes('-'), 'deve ter separador');
  });

  test('contém uma linha por tarefa', () => {
    const tasks = [taskBase, { ...taskBase, id: 'aaaabbbb-0000-4000-8000-000000000000', titulo: 'Outra' }];
    const tabela = formatarTabela(tasks);
    assert.ok(tabela.includes('550e8400'), 'deve conter id da primeira tarefa');
    assert.ok(tabela.includes('aaaabbbb'), 'deve conter id da segunda tarefa');
  });
});

describe('Tarefa 03 — parseTags(entrada)', () => {
  test('string vazia retorna []', () => {
    assert.deepEqual(parseTags(''), []);
  });

  test('uma tag sem vírgula retorna array com um item', () => {
    assert.deepEqual(parseTags('auth'), ['auth']);
  });

  test('múltiplas tags separadas por vírgula', () => {
    assert.deepEqual(parseTags('auth, backend, api'), ['auth', 'backend', 'api']);
  });

  test('remove espaços extras', () => {
    assert.deepEqual(parseTags('  auth  ,  backend  '), ['auth', 'backend']);
  });

  test('filtra itens vazios', () => {
    assert.deepEqual(parseTags('auth,,backend'), ['auth', 'backend']);
  });
});

describe('Tarefa 03 — parsePrioridade(entrada)', () => {
  test('"alta" retorna "alta"', () => {
    assert.equal(parsePrioridade('alta'), 'alta');
  });

  test('"baixa" retorna "baixa"', () => {
    assert.equal(parsePrioridade('baixa'), 'baixa');
  });

  test('"media" retorna "media"', () => {
    assert.equal(parsePrioridade('media'), 'media');
  });

  test('string inválida retorna "media" (fallback)', () => {
    assert.equal(parsePrioridade('urgente'), 'media');
  });

  test('string vazia retorna "media"', () => {
    assert.equal(parsePrioridade(''), 'media');
  });
});

describe('Tarefa 03 — validarTitulo(entrada)', () => {
  test('string não vazia retorna true', () => {
    assert.equal(validarTitulo('Fix login'), true);
  });

  test('string vazia retorna false', () => {
    assert.equal(validarTitulo(''), false);
  });

  test('string só com espaços retorna false', () => {
    assert.equal(validarTitulo('   '), false);
  });
});
