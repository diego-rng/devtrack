import http from 'http';
import { adicionarTask, DB_PATH, lerDB, listarTasks } from '../storage/db.js';
import { createReadStream } from 'fs';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;
  const method = req.method;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (method === 'GET' && route === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  }

  if (method === 'GET' && route === '/tasks') {
    try {
      if (url.searchParams.has('status' || 'prioridade' || 'projeto')) {
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
        console.log(fullFilter);
        const db = await listarTasks(fullFilter);
        res.writeHead(200);
        return res.end(JSON.stringify(db));
      } else {
        const db = await lerDB();
        res.writeHead(200);
        res.end(JSON.stringify(db.tasks));
      }
    } catch (err) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (method === 'POST' && route === '/tasks') {
    const filter = url.searchParams.toString().split('&');
    const fullFilter = new Object();

    if (!url.searchParams.toString().includes('titulo'||'status'||'prioridade'||'projeto')) {
      res.writeHead(400)
      res.end(JSON.stringify({error: "POST request missing a necessary field."}))
    }
    const titleIndex = filter.findIndex((a) => a.includes('titulo'));
    fullFilter.titulo = filter[titleIndex].slice[6];

    const statusIndex = filter.findIndex((a) => a.includes('status'));
    fullFilter.status = filter[statusIndex].slice[7];

    const prioIndex = filter.findIndex((a) => a.includes('prioridade'));
    fullFilter.prioridade = filter[prioIndex].slice[11];

    const projIndex = filter.findIndex((a) => a.includes('projeto'));
    fullFilter.projeto = filter[projIndex].slice(8);

    const task = await adicionarTask(fullFilter);
    res.writeHead(201);
    res.end(JSON.stringify(task));
  }

  if (method === 'PATCH' && route === '/tasks/:id') {
  }

  if (method === 'DELETE' && route === '/tasks/:id') {
  }
});

server.listen(3000, '127.0.0.1', () => console.log('Server started on 3000'));
