import http from 'http';
import {
  adicionarTask,
  atualizarTask,
  lerDB,
  listarTasks,
  removerTask,
} from '../storage/db.js';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;
  const method = req.method;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (route === '/health' && method !== 'GET') {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  if (method === 'GET' && route === '/health') {
    const start = Date.now();
    res.writeHead(200);
    const end = Date.now() - start;
    console.log(`[${method}] ${route} -> 200 (${end}ms)`);
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  }

  if (route === '/tasks' && !['GET', 'POST'].includes(method)) {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  if (method === 'GET' && route === '/tasks') {
    const start = Date.now();
    try {
      if (
        ['status', 'prioridade', 'projeto'].some((k) => url.searchParams.has(k))
      ) {
        const filter = url.searchParams.toString().split('&');
        const fullFilter = new Object();

        if (filter.toString().includes('status')) {
          const index = filter.findIndex((a) => a.includes('status'));
          fullFilter.status = filter[index].slice(7);
        }
        if (filter.toString().includes('prioridade')) {
          const index = filter.findIndex((a) => a.includes('prioridade'));
          fullFilter.prioridade = filter[index].slice(11);
        }
        if (filter.toString().includes('projeto')) {
          const index = filter.findIndex((a) => a.includes('projeto'));
          fullFilter.projeto = filter[index].slice(8);
        }
        const db = await listarTasks(fullFilter);
        res.writeHead(200);
        const end = Date.now() - start;
        console.log(`[${method}] ${route} -> 200 (${end}ms)`);
        return res.end(JSON.stringify(db));
      } else {
        const db = await lerDB();
        res.writeHead(200);
        res.end(JSON.stringify(db.tasks));
      }
    } catch (err) {
      res.writeHead(500);
      const end = Date.now() - start;
      console.log(`[${method}] ${route} -> 500 (${end}ms)`);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (method === 'POST' && route === '/tasks') {
    const start = Date.now();
    const filter = url.searchParams.toString().split('&');
    const fullFilter = new Object();
    try {
      if (
        !['titulo', 'status', 'prioridade', 'projeto'].some((k) =>
          url.searchParams.has(k),
        )
      ) {
        throw new Error('POST request missing a necessary field.');
      }

      const titleIndex = filter.findIndex((a) => a.includes('titulo'));
      if (titleIndex >= 0) {
        fullFilter.titulo = filter[titleIndex].slice(6);
      }

      const statusIndex = filter.findIndex((a) => a.includes('status'));
      if (statusIndex >= 0) {
        fullFilter.status = filter[statusIndex].slice(7);
      }

      const prioIndex = filter.findIndex((a) => a.includes('prioridade'));
      if (prioIndex >= 0) {
        fullFilter.prioridade = filter[prioIndex].slice(11);
      }
      const projIndex = filter.findIndex((a) => a.includes('projeto'));
      if (projIndex >= 0) fullFilter.projeto = filter[projIndex].slice(8);

      const task = await adicionarTask(fullFilter);
      res.writeHead(201);
      const end = Date.now() - start;
      console.log(`[${method}] ${route} -> 201 (${end}ms)`);
      return res.end(JSON.stringify(task));
    } catch (err) {
      if (err.message == 'POST request missing a necessary field.') {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }
  }

  if (
    route.startsWith('/tasks/') &&
    route.split('/').length === 3 &&
    !['PATCH', 'DELETE'].includes(method)
  ) {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  if (
    method === 'PATCH' &&
    route.startsWith('/tasks/') &&
    route.split('/').length === 3
  ) {
    const start = Date.now();
    const id = route.split('/')[2];
    const params = url.searchParams.toString().split('&');
    const fullParams = new Object();
    if (params.toString().includes('status')) {
      const index = params.findIndex((a) => a.includes('status'));
      fullParams.status = params[index].slice(7);
    }
    if (params.toString().includes('prioridade')) {
      const index = params.findIndex((a) => a.includes('prioridade'));
      fullParams.prioridade = params[index].slice(11);
    }
    if (params.toString().includes('projeto')) {
      const index = params.findIndex((a) => a.includes('projeto'));
      fullParams.projeto = params[index].slice(8);
    }
    if (params.toString().includes('descricao')) {
      const index = params.findIndex((a) => a.includes('descricao'));
      fullParams.descricao = params[index].slice(10);
    }
    if (params.toString().includes('titulo')) {
      const index = params.findIndex((a) => a.includes('titulo'));
      fullParams.titulo = params[index].slice(7);
    }
    try {
      const update = await atualizarTask(id, fullParams);
      res.writeHead(202);
      const end = Date.now() - start;
      console.log(`[${method}] ${route} -> 202 (${end}ms)`);
      return res.end(JSON.stringify(update));
    } catch (err) {
      if (err.message === 'No task matches the ID provided.') {
        res.writeHead(404);
        const end = Date.now() - start;
        console.log(`[${method}] ${route} -> 404 (${end}ms)`);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }
  }

  if (
    method === 'DELETE' &&
    route.startsWith('/tasks/') &&
    route.split('/').length === 3
  ) {
    const start = Date.now();
    const id = route.split('/')[2];
    try {
      await removerTask(id);
      res.writeHead(204);
      const end = Date.now() - start;
      console.log(`[${method}] ${route} -> 204 (${end}ms)`);
      return res.end();
    } catch (err) {
      if (err.message === "Task doesn't exist.") {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: err.message }));
      }
    }
  }
});

export async function serveCall(port = 3000) {
  try {
    server.listen(port, '127.0.0.1', () =>
      console.log(`Server started on port ${port}`),
    );
  } catch (err) {
    throw err
  }
}
