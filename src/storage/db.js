import { readFile, writeFile, rename, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DB_PATH = path.join(
  __dirname,
  path.normalize('../../data/devtrack.json'),
);

// #region lerDB
export async function lerDB() {
  if (!existsSync(DB_PATH)) {
    await writeFile(
      DB_PATH,
      '{ "version": "1.0", "projects": [], "tasks": [], "log": [] }',
    );
  }
  return JSON.parse(await readFile(DB_PATH, 'utf-8'));
}

// #region salvarDB
export async function salvarDB(dados) {
  const temp = JSON.stringify(dados);
  await writeFile(DB_PATH, temp);
}

// #region adicionarTask
export async function adicionarTask(task) {
  const newID = uuid();
  const content = JSON.parse(await readFile(DB_PATH, 'utf-8'));
  
  task.id = newID;
  if (
    task.status &&
    !['pendente', 'em_progresso', 'concluida'].includes(task.status)
  ) {
    console.log('ERROR: Invalid status');
    return;
  }

  if (
    task.prioridade &&
    !['alta', 'media', 'baixa'].includes(task.prioridade)
  ) {
    console.log('ERROR: Invalid priority');
    return;
  }

  if (!task.status) {
    task.status = 'pendente';
  }
  if (!task.projeto) {
    task.projeto = '';
  }
  if (!task.prioridade) {
    task.prioridade = 'media';
  }
  content.tasks.push(task);
  if (!task.tags) {
    task.tags = [];
  }
  task.criadaEm = new Date();
  task.atualizadaEm = task.criadaEm;

  await writeFile(DB_PATH, JSON.stringify(content, null, 2))
  return task;
}

// #region atualizarTask
export async function atualizarTask(id, campos) {
  const content = JSON.parse(await readFile(DB_PATH, 'utf-8'));
  try {
    if (!content.tasks.some((task) => task.id === id)) {
      throw new Error('No task matches the ID provided.');
    }
  
    const identifier = content.tasks.findIndex((cont) => cont.id === id);
  
    if (campos.titulo != undefined) {
      content.tasks[identifier].titulo = campos.titulo;
    }
  
    if (campos.descricao != undefined) {
      content.tasks[identifier].descricao = campos.descricao;
    }
  
    if (campos.status != undefined) {
      if (['pendente', 'em_progresso', 'concluida'].includes(campos.status)) {
        content.tasks[identifier].status = campos.status;
      } else {
        console.log('Incorrect status');
        return;
      }
    }
  
    if (campos.prioridade != undefined) {
      if (['alta', 'media', 'baixa'].includes(campos.prioridade)) {
        content.tasks[identifier].prioridade = campos.prioridade;
      } else {
        console.log('Incorrect priority');
        return;
      }
    }
  
    if (campos.projeto != undefined) {
      content.tasks[identifier].projeto = campos.projeto;
    }
  
    if (campos.tags != undefined) {
      content.tasks[identifier].tags = campos.tags;
    }
  
    if (campos.branch != undefined) {
      content.tasks[identifier].branch = campos.branch;
    }
  
    content.tasks[identifier].atualizadaEm = new Date();
  
    await writeFile(DB_PATH, JSON.stringify(content, null, 2))
    return content
  } catch(err) {
    console.error(err)
    throw err
  }
  return;
}

// #region removerTask
export async function removerTask(id) {
  const content = JSON.parse(await readFile(DB_PATH, 'utf-8'));

  if (content.tasks.some((task) => task.id === id)) {
    const result = content.tasks.filter((task) => task.id != id);
    content.tasks = result
    await writeFile(DB_PATH, JSON.stringify(content, null, 2));
    console.log("Task removed!");
    return
  } else {
    throw new Error("Task doesn't exist.");
  }
}

// #region listarTasks
export async function listarTasks(filtro) {
  const content = JSON.parse(await readFile(DB_PATH, 'utf-8'));
  if (filtro == undefined) {
    return content.tasks;
  } else {
    if (filtro.titulo != undefined) {
      content.tasks = content.tasks.filter((a) => a.titulo === filtro.titulo);
    }
    if (filtro.descricao != undefined) {
      content.tasks = content.tasks.filter(
        (a) => a.descricao === filtro.descricao,
      );
    }
    if (filtro.status != undefined) {
      content.tasks = content.tasks.filter((a) => a.status === filtro.status);
    }
    if (filtro.prioridade != undefined) {
      content.tasks = content.tasks.filter(
        (a) => a.prioridade === filtro.prioridade,
      );
    }
    if (filtro.projeto != undefined) {
      content.tasks = content.tasks.filter((a) => a.projeto === filtro.projeto);
    }
    if (filtro.tags != undefined) {
      content.tasks = content.tasks.filter(
        (a) => !a.tags.includes(filtro.tags),
      );
    }
    return content.tasks;
  }
}

// #region fazerBackup
export async function fazerBackup() {
  const newBackup = await readFile(DB_PATH, 'utf-8');
  const currentDate = new Date();
  try {
    await writeFile(
      path.normalize(
        './exports/devtrack-' +
          currentDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
      ) + '.json',
      newBackup,
    );
    return (
      path.normalize(
        './exports/devtrack-' +
          currentDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
      ) + '.json'
    );

    console.log('Backed up successfully!');
  } catch (err) {
    console.error(err);
  }
}
