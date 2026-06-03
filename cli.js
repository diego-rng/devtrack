#!/usr/bin/env node
// cli.js - Entry point do DevTrack
import { readEnv } from './src/utils/config.js';
import { buscarIssues } from './src/services/github.js';
import * as git from './src/services/git.js';
import * as db from './src/storage/db.js';
import * as imp from './src/services/export.js';
import { ac, serveCall } from './src/server/index.js';
import * as hist from './src/services/history.js';

import path from 'path';
import { readdir } from 'fs';
import fs from 'node:fs/promises';
import { parse } from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { select, input, checkbox, Separator } from '@inquirer/prompts';
import * as child from 'child_process';
import { promisify } from 'util';
import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import os from 'os';
import { performance, PerformanceObserver } from 'perf_hooks';
console.log('DevTrack v1.0');
console.log('Node:', process.version);
console.log('Plataforma:', process.platform);

const config = readEnv();

const program = new Command()
  .name('devtrack')
  .description('CLI para gerenciamento de projetos')
  .version('1.0.0');

const DB_PATH = path.normalize('./data/devtrack.json');

// #region add command

program
  .command('add')
  .description('Adiciona uma nova tarefa')
  .argument('<titulo>', 'titulo da task')
  .option('-p, --prioridade <n>', 'alta|media|baixa', 'media')
  .option('-t, --tags <tags...>', 'tags da tarefa')
  .option('-P, --projeto <nome>', 'projeto associado')
  .option('-D, --descricao <desc>', 'descricao da tarefa')
  .action(async (titulo, opts) => {
    const full = {
      titulo: titulo,
      prioridade: opts.prioridade,
      tags: opts.tags,
      projeto: opts.projeto,
      descricao: opts.descricao,
    };
    await db.adicionarTask(full);
    console.log(chalk.green('✔  Tarefa criada com sucesso!'));
    process.exit(0);
  });
//#endregion add command
// #region list command

program
  .command('list')
  .description('Lista todas as tarefas')
  .option('--status <status>', 'status da tarefa')
  .option('--prioridade <n>', 'prioridade da tarefa')
  .option('--projeto <nome>', 'projeto associado')
  .option('--json', 'retorna em JSON puro')
  .action(async (opts) => {
    try {
      let done = (await parseJSON(DB_PATH)).tasks;
      if (opts.json) {
        console.log(done);
      } else {
        if (opts.status) {
          done = done.filter((a) => a.status === opts.status);
        }
        if (opts.prioridade) {
          done = done.filter((a) => a.prioridade === opts.prioridade);
        }
        if (opts.projeto) {
          done = done.filter((a) => a.projeto === opts.projeto);
        }
        const fullDone = done.map((task) => ({
          id: task.id.slice(0, 8),
          titulo: task.titulo.slice(0, 29),
          status: task.status,
          prioridade: task.prioridade,
          projeto: task.projeto,
        }));
        console.table(fullDone);
      }
      process.exit(0);
    } catch (err) {
      console.error(chalk.red.bold(err));
    }
  });

// #region update command

program
  .command('update <id>')
  .description('Atualiza a tarefa especificada.')
  .option('--status <status>', 'status da tarefa')
  .option('--prioridade <n>', 'alta|media|baixa', 'media')
  .option('--tags <tags...>', 'tags da tarefa')
  .option('--projeto <nome>', 'projeto associado')
  .option('--descricao <desc>', 'descricao da tarefa')
  .action(async (id, opts) => {
    try {
      const full = {
        titulo: titulo,
        descricao: opts.descricao,
        status: opts.status,
        prioridade: opts.prioridade,
        projeto: opts.projeto,
        tags: opts.tags,
      };

      await db.atualizarTask(id, full);
      process.exit(0);
    } catch (err) {
      console.error(chalk.red.bold(err));
    }
  });

// #region remove command

program
  .command('remove <id>')
  .description('Remove a tarefa especificada')
  .action(async (id) => {
    try {
      await db.removerTask(id);
      process.exit(0);
    } catch (err) {
      console.error(chalk.red.bold(err));
    }
  });

// #region export command

program
  .command('export <path>')
  .description(
    'Exporta a base de dados em CSV para o caminho de saída especificado.',
  )
  .option('--status <status>', 'status da tarefa')
  .option('--prioridade <n>', 'alta|media|baixa', 'media')
  .option('--tags <tags...>', 'tags da tarefa')
  .option('--projeto <nome>', 'projeto associado')
  .option('--descricao <desc>', 'descricao da tarefa')
  .action(async (path, opts) => {
    const spinner = ora('Exportando base de dados...').start();
    try {
      let full = undefined;
      if (opts) {
        full = {
          descricao: opts.descricao,
          status: opts.status,
          prioridade: opts.prioridade,
          projeto: opts.projeto,
          tags: opts.tags,
        };
      }
      const exp = await imp.exportarCSV(full, path);
      if (exp == true) {
        spinner.succeed(chalk.green('Exportado com sucesso!'));
        process.exit(0);
      } else {
        throw new Error('failed CSV');
      }
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`));
    }
  });

// #region github command

program
  .command('github')
  .description('Lista todas as issues ativas no repositório do DevTrack.')
  .action(async () => {
    if (config.githubToken === 'Não definido') {
      console.warn('Comando desabilitado, Token do Github não foi definido.');
      process.exit(0);
    }
    const spinner = ora('Sincronizando com GitHub...').start();
    try {
      const full = await buscarIssues(
        'diego-rng/devtrack',
        process.env.GITHUB_TOKEN,
      );
      console.log(full);
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`));
    }
  });

// #region git command

program
  .command('git')
  .argument('<id>', 'ID da task')
  .argument('<titulo>', 'Título da Branch')
  .action((id, titulo) => {
    const spinner = ora('Creating branch...').start();
    try {
      git
        .criarBranchDaTarefa(id, titulo)
        .then(spinner.succeed(chalk.green('Branch criada com sucesso!')));
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`));
    }
  });

// #region new command

program
  .command('new')
  .description('Começa um prompt guiado para criar uma nova tarefa')
  .action(newPrompt);

// #region serve command

program
  .command('serve')
  .argument('[porta]', 'Porta para abrir o servidor', process.env.PORT)
  .action(async (port) => {
    try {
      await serveCall(port);
    } catch (err) {
      console.error(err);
    }
  });

// #region analyze command

program
  .command('analyze')
  .description('Analiza os arquivos .log e .csv da pasta.')
  .action(async () => {
    try {
      performance.mark('start-csv');

      const { results: csv, workersUsed: csvUsed } = await processInParallel(
        undefined,
        'csv',
      );

      performance.mark('end-csv');
      performance.measure('csv-full', 'start-csv', 'end-csv');
      const [timeCSV] = performance.getEntriesByName('csv-full');

      performance.mark('start-log');

      const { results: log, workersUsed: logUsed } = await processInParallel(
        undefined,
        'log',
      );

      performance.mark('end-log');
      performance.measure('log-full', 'start-log', 'end-log');
      const [timeLOG] = performance.getEntriesByName('log-full');

      let totalFiles = 0;
      let totalLines = 0;
      let totalSize = 0;

      console.log('CSV:\n');
      for (let i = 0; i < csv.length; i++) {
        console.log(`Number ${i + 1}:`);
        for (const [key, value] of Object.entries(csv[i])) {
          totalFiles++;
          totalLines += csv[i].lines;
          totalSize += csv[i].sizeBytes;
          console.log(`   ${key}: ${value}`);
        }
      }
      console.log('Log:\n');
      for (let i = 0; i < log.length; i++) {
        console.log(`Number ${i + 1}: `);
        for (const [key, value] of Object.entries(log[i])) {
          console.log(`   ${key}: ${value}`);
        }
      }
      console.log('---------------------');
      console.log(
        `Relatório Final:\n   Total de arquivos: ${totalFiles}\n   Total de Linhas: ${totalLines}\n   Tamanho total: ${totalSize} bytes\n   Time needed: ${timeCSV.duration > timeLOG.duration ? timeCSV.duration.toFixed(4) : timeLOG.duration.toFixed(4)}ms\n   Total de Workers usados: ${csvUsed + logUsed}`,
      );
    } catch (err) {
      console.error(chalk.red(`Erro: ${err.message}`));
    }
  });

// #region config command

program
  .command('config <--list>')
  .description('Exibe as configurações atuais do devtrack')
  .action(() => {
    console.log(JSON.stringify(config));
  });

// #region undo command

program
  .command('undo')
  .description('Desfaz a última mudança')
  .action(async () => {
  if (hist.undoStack.isEmpty()) {
    console.log('Nada para desfazer');
    process.exit(0);
  }
  await hist.undo().then(console.log('Alteração desfeita com sucesso!'));
  });

// #region redo command

program
  .command('redo')
  .description('Refaz a última coisa desfeita')
  .action(async () => {
    if (hist.redoStack.isEmpty()) {
      console.log('Nada para refazer');
      process.exit(0)
    }
    await hist.redo().then(console.log('Alteração refeita com sucesso!'));
  });

async function main() {
  await pluginCall();
  program.parse(process.argv);
}

main().catch((err) => {
  console.error(chalk.red(err.message));
  process.exit(1);
});

// #region parseJSON

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

// #region addPrompt

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

// #region updateSTatus

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

// #region newPrompt

async function newPrompt() {
  const res = await fs.readFile(DB_PATH, 'utf-8');
  const parsed = await JSON.parse(res).tasks;
  let list = [];
  for (let i = 0; i < parsed.length; i++) {
    const values = Object.entries(parsed[i])
      .filter(([key]) => key === 'projeto')
      .map(([, value]) => {
        if (list.length == 0) {
          return value;
        }
        if (!list.includes([value])) {
          return value;
        }
      });
    list.push(values[0]);
  }
  let fullList = new Array();
  for (let i = 0; i < list.length; i++) {
    const iterator = fullList.values();
    let isTrue = false;
    for (const value of iterator) {
      if (value.name == list[i]) {
        isTrue = true;
      }
    }
    if (isTrue == false) {
      if (list[i].length > 0) {
        fullList.push({ name: list[i], value: list[i] });
      }
    }
  }

  fullList.push({ name: 'Criar novo projeto', value: 'val' });
  try {
    let newProj = new Boolean();
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'titulo',
        message: 'Título da tarefa:',
        validate: (v) =>
          3 <= v.length <= 100 || 'Mínimo 3 caracteres, Máximo 100.',
      },
      {
        type: 'input',
        name: 'descricao',
        message: 'Insira a descrição',
        required: true,
      },
      {
        type: 'select',
        name: 'prioridade',
        message: 'Prioridade:',
        choices: ['alta', 'media', 'baixa'],
      },
      {
        type: 'select',
        name: 'projeto',
        message: 'Projeto:',
        choices: fullList,
        default: 'val',
      },
    ]);
    let projName;
    if (answers.projeto === 'val') {
      projName = await inquirer.prompt({
        type: 'input',
        message: 'Nome do projeto:',
        required: true,
      });
    }
    const tags = await inquirer.prompt({
      type: 'checkbox',
      message: 'Selecione as tags válidas:',
      choices: [
        { name: 'Front-End', value: 'frontend' },
        { name: 'Back-End', value: 'backend' },
        { name: 'Bug', value: 'bug' },
        { name: 'Feature', value: 'feature' },
      ],
    });
    const obj = await {
      titulo: answers.titulo,
      descricao: answers.descricao,
      prioridade: answers.prioridade,
      projeto:
        answers.projeto === 'val'
          ? Object.values(projName)[0]
          : answers.projeto,
      tags: Object.values(tags)[0],
    };
    console.log(obj);
    const ans = await inquirer.prompt({
      type: 'confirm',
      message: 'Criar esta tarefa?',
      default: true,
    });

    if (ans) {
      const task = await db.adicionarTask(obj);
      const iterator = list.toString().split(',');
      const projList = [];
      for (let i = 0; i < iterator.length; i++) {
        if (iterator[i] == task.projeto) {
          projList.push(iterator[i]);
        }
      }
      console.log(chalk.green('Tarefa criada! ID: '), chalk.cyan(`${task.id}`));
      console.log(
        chalk.green('Projeto'),
        chalk.gray(`${task.projeto}`),
        chalk.green('possui'),
        chalk.gray(answers.projeto === 'val' ? 1 : projList.length),
        chalk.green('tarefas.'),
      );
      return;
    } else return;
  } catch (e) {
    if (e.name === 'ExitPromptError') process.exit(0);
    throw e;
  }
}

// #region processInParallel

async function processInParallel(file = undefined, type = undefined) {
  const maxWorkers = os.cpus().length;
  const results = [];
  let workersUsed = 0;

  if (file != undefined) {
    const promises = executeWorker(file);
    results.push(...(await Promise.all(promises)));
  } else if (type != undefined) {
    const files = await fs.readdir('./', {
      recursive: true,
      encoding: 'utf-8',
      withFileTypes: true,
    });
    const filtered = files.filter(
      (a) => a.isDirectory() === false && a.name.includes(type),
    );
    let filesDone = 0;
    for (let i = 0; i < filtered.length; i += maxWorkers) {
      workersUsed++;
      const batch = filtered.slice(i, i + maxWorkers);
      const result = batch.map((a) => {
        const filePath = path.join(a.parentPath ?? a.path, a.name);
        return executeWorker(filePath).then((res) => {
          filesDone++;
          console.log(
            `Processando ${filesDone}/${filtered.length} arquivos...`,
          );
          return res;
        });
      });
      results.push(...(await Promise.all(result)));
    }
  } else throw new Error('Missing a required entry');
  return { results, workersUsed };
}

// #region executeWorker

function executeWorker(data) {
  return new Promise((resolve, reject) => {
    let filesDone = 0;
    const w = new Worker(new URL('./workers/fileWorker.js', import.meta.url), {
      workerData: data,
    });
    w.errors = 0;

    w.on('message', resolve);
    w.on('error', (err) => {
      w.errors++;
      console.log(
        `Encountered an error: ${err.message}\n Error number ${w.errors}`,
      );
      reject(err);
    });
    w.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker ended with code ${code}`));
    });
  });
}

// #region pluginCall

async function pluginCall() {
  try {
    const plugins = await fs.readdir('./plugins', 'utf-8', (err) => {
      if (err) {
        console.log(err.message);
        throw err;
      }
    });

    if (plugins.length >= 1) {
      for (const p of plugins) {
        try {
          const mod = await import('./plugins/' + p);
          registerPlugin(mod.default);
        } catch (err) {
          console.warn(`[Plugin] ${p}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error;
  }
}

// #region registerPlugin

function registerPlugin(mod) {
  if (mod.comandos.length === 0) return;

  mod.comandos.forEach((register) => register(program));
}

process.on('SIGINT', () => {
  console.log('\nProcesso interrompido.\nEncerrando...');
  ac.abort();
  process.exit(0);
});
