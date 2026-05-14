#!/usr/bin/env node
// cli.js - Entry point do DevTrack
import path from 'path';
import fs from 'node:fs/promises';
import { parse } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { buscarIssues } from './src/services/github.js'
import * as db from './src/storage/db.js';
import * as imp from './src/services/export.js';
console.log('DevTrack v1.0');
console.log('Node:', process.version);
console.log('Plataforma:', process.platform);

const rl = readline.createInterface({ input, output, terminal: true });

const DB_PATH = path.normalize('./data/devtrack.json');

rl.setPrompt(
  '--------MENU--------\n1. Adicionar\n2. Listar\n3. Atualizar status\n4. Sair\n5. Exportar CSV\n6. Exportar log comprimido\n7. Importar issues do GitHub\n> ',
);

await rl.prompt();

rl.on('line', async (line) => {
  switch (line) {
    case '1': {
      await addPrompt(line);
        rl.prompt();
    }
    case '2': {
      const done = (await parseJSON(DB_PATH)).tasks;
      const fullDone = done.map((task) => ({
        id: task.id.slice(0, 8),
        titulo: task.titulo.slice(0, 29),
        status: task.status,
        prioridade: task.prioridade,
      }));
      console.table(fullDone);
      rl.prompt();
    }
    case '3': {
      process.stdout.write('\x1Bc');
      const id = await rl.question('ID da Task: ');
      console.log('\n');
      const newStatus = await rl.question(
        'Novo Status ("concluida", "em_progresso" ou "pendente"): ',
      );
      console.log('\n');
      await updateStatus(id, newStatus);
        rl.prompt();
    }
    case '4': {
      rl.close();
      process.exit(0);
    }
    case '5': {
      let filtro = await rl.question('Filtro (estruture como Objeto JS): ');
      if (filtro != '') filtro = await JSON.parse(filtro);
      const caminhoSaida = await rl.question('Caminho de saída: ');
      await imp.exportarCSV(filtro, caminhoSaida);
      rl.prompt();
    }
    case '6': {
      const caminhoSaida = await rl.question('Caminho de saída: ');
      await imp.exportarLogComprimido(caminhoSaida);
      rl.prompt();
    }
    case '7': {
      const pages = await rl.question('Página? (deixe em branco para página 1.): ')
      const response = await buscarIssues('diego-rng/devtrack', process.env.GITHUB_TOKEN, (pages === '' ? null : pages));
      console.log(await response);
      rl.prompt();
    }
    default: {
      console.log('Invalid input');
      rl.prompt();
    }
  }
});

async function parseJSON(raw) {
  try {
    const unparsed = await fs.readFile(raw, 'utf-8');
    const parsed = await JSON.parse(unparsed);
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw new SyntaxError(`Invalid JSON in ${raw}: ${err.message}`);
  }
}

async function addPrompt(line) {
  const title = await rl.question('Título (Obrigatório): ');
  const prio = await rl.question('Prioridade: ');
  const tags = await rl.question(
    'Tags (separadas por vírgula, pode deixar em branco): ',
  );
  let tagsFixed = [];
  if (tags) {
    tagsFixed = tags.split(',');
  }
  let prioFixed = prio;

  if (prio != 'alta' || 'baixa') {
    prioFixed = 'media';
  }

  const task = {
    titulo: title,
    prioridade: prioFixed,
    tags: tagsFixed,
    status: 'pendente',
  };

  setTimeout(() => {
    db.adicionarTask(task);
  }, 0);
  return;
}

async function updateStatus(id, newStatus) {
  const updatePrompted = {
    status: newStatus,
  };

  db.atualizarTask(id, updatePrompted);
}

if (!process.stdout.isTTY) {
  const tasks = await parseJSON(DB_PATH);
  const complete = tasks.tasks;
  console.log(complete);
  console.log('Process not running in a TTY context. Exiting...');
  process.exit(0);
}

rl.on('SIGINT', () => {
  console.log('\nEncerrando...');
  rl.close();
  process.exit(0);
});
