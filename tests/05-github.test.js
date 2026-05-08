import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';

const _fetchOriginal = globalThis.fetch;

after(() => {
  globalThis.fetch = _fetchOriginal;
});

function mockFetch({ status = 200, body = [], headers = {} } = {}) {
  globalThis.fetch = async () => ({
    ok:      status >= 200 && status < 300,
    status,
    headers: { get: (h) => headers[h] ?? null },
    json:    async () => body,
  });
}

const getGitHub = () => import('../src/services/github.js');

describe('Tarefa 05 — buscarIssues: paginação', () => {
  test('hasNextPage = false quando Link não contém rel="next"', async () => {
    mockFetch({ headers: { link: '<url>; rel="last"' } });
    const { buscarIssues } = await getGitHub();
    const { hasNextPage } = await buscarIssues('owner/repo', null);
    assert.equal(hasNextPage, false);
  });

  test('hasNextPage = true quando Link contém rel="next"', async () => {
    mockFetch({ headers: { link: '<url>; rel="next", <url>; rel="last"' } });
    const { buscarIssues } = await getGitHub();
    const { hasNextPage } = await buscarIssues('owner/repo', null);
    assert.equal(hasNextPage, true);
  });

  test('hasNextPage = false quando não há header Link', async () => {
    mockFetch({ headers: {} });
    const { buscarIssues } = await getGitHub();
    const { hasNextPage } = await buscarIssues('owner/repo', null);
    assert.equal(hasNextPage, false);
  });
});

describe('Tarefa 05 — buscarIssues: conversão de issues', () => {
  const issueRaw = {
    title:  'Bug no login',
    body:   'Descrição do bug',
    labels: [{ name: 'bug' }, { name: 'auth' }],
  };

  test('titulo = issue.title', async () => {
    mockFetch({ body: [issueRaw] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.equal(issues[0].titulo, 'Bug no login');
  });

  test('tags = array de labels', async () => {
    mockFetch({ body: [issueRaw] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.deepEqual(issues[0].tags, ['bug', 'auth']);
  });

  test('descricao = body truncado em 200 chars', async () => {
    const bodyLongo = 'A'.repeat(300);
    mockFetch({ body: [{ ...issueRaw, body: bodyLongo }] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.equal(issues[0].descricao.length, 200);
  });

  test('descricao = "" quando body é null', async () => {
    mockFetch({ body: [{ ...issueRaw, body: null }] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.equal(issues[0].descricao, '');
  });

  test('status = "pendente" fixo', async () => {
    mockFetch({ body: [issueRaw] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.equal(issues[0].status, 'pendente');
  });

  test('prioridade = "media" fixo', async () => {
    mockFetch({ body: [issueRaw] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('owner/repo', null);
    assert.equal(issues[0].prioridade, 'media');
  });

  test('projeto = repo passado como argumento', async () => {
    mockFetch({ body: [issueRaw] });
    const { buscarIssues } = await getGitHub();
    const { issues } = await buscarIssues('meu-org/meu-repo', null);
    assert.equal(issues[0].projeto, 'meu-org/meu-repo');
  });
});

describe('Tarefa 05 — buscarIssues: erros HTTP', () => {
  test('401 lança Error com "Token"', async () => {
    mockFetch({ status: 401 });
    const { buscarIssues } = await getGitHub();
    await assert.rejects(
      () => buscarIssues('owner/repo', 'token-invalido'),
      (err) => { assert.ok(err.message.includes('Token')); return true; }
    );
  });

  test('403 lança Error com "Rate limit"', async () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    mockFetch({ status: 403, headers: { 'x-ratelimit-reset': String(reset) } });
    const { buscarIssues } = await getGitHub();
    await assert.rejects(
      () => buscarIssues('owner/repo', null),
      (err) => { assert.ok(err.message.toLowerCase().includes('rate limit')); return true; }
    );
  });

  test('404 lança Error com nome do repo', async () => {
    mockFetch({ status: 404 });
    const { buscarIssues } = await getGitHub();
    await assert.rejects(
      () => buscarIssues('dono/repo-inexistente', null),
      (err) => { assert.ok(err.message.includes('dono/repo-inexistente')); return true; }
    );
  });

  test('5xx lança Error com o status code', async () => {
    mockFetch({ status: 503 });
    const { buscarIssues } = await getGitHub();
    await assert.rejects(
      () => buscarIssues('owner/repo', null),
      (err) => { assert.ok(err.message.includes('503')); return true; }
    );
  });
});
