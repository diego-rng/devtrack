#!/usr/bin/env node
// cli.js - Entry point do DevTrack
import path from 'path';
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

import { buscarIssues } from './src/services/github.js';
import * as git from './src/services/git.js';
import * as db from './src/storage/db.js';
import * as imp from './src/services/export.js';
console.log('DevTrack v1.0');
console.log('Node:', process.version);
console.log('Plataforma:', process.platform);

// const rl = readline.createInterface({ stdin, stdout, terminal: true });

const program = new Command()
  .name('devtrack')
  .description('CLI para gerenciamento de projetos')
  .version('1.0.0');

const DB_PATH = path.normalize('./data/devtrack.json');

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
  .action(async (opts, path) => {
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
      await imp.exportarCSV(full, path)
        .then(
          spinner.succeed(chalk.green('Exportado com sucesso!')),
          process.exit(0),
        );
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`));
    }
  });

program
  .command('github')
  .description('Lista todas as issues ativas no repositório do DevTrack.')
  .action(async () => {
  const spinner = ora('Sincronizando com GitHub...').start();
  try {
    const full = await buscarIssues('diego-rng/devtrack', process.env.GITHUB_TOKEN)
    console.log(full)
  } catch (err) {
    spinner.fail(chalk.red(`Erro: ${err.message}`));
  }
});

program
  .command('git')
  .argument('<id>' , 'ID da task')
  .argument('<titulo>', 'Título da Branch')
  .action((id, titulo) => {
    const spinner = ora('Creating branch...').start()
    try { 
      git.criarBranchDaTarefa(id, titulo).then(
        spinner.succeed(chalk.green('Branch criada com sucesso!'))
      )
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`))
    }
  })

program.parse(process.argv);

// case '7': {
//   const pages = await rl.question(
//     'Página? (deixe em branco para página 1.): ',
//   );
//   const response = await buscarIssues(
//     'diego-rng/devtrack',
//     process.env.GITHUB_TOKEN,
//     pages === '' ? null : pages,
//   );
//   console.log(await response);
//   rl.prompt();
// }
// case '8': {
//   const id = await rl.question('ID da Tarefa: ');
//   const response = await git.getBranch();
//   const tarefa = { branch: response };
//   await db.atualizarTask(id, tarefa);
//   rl.prompt();
// }

// const firstSelect = await select({
//   message: 'What would you like to do?',
//   choices: [
//     {
//       name: 'Add',
//       value: 'add',
//       description: 'Adiciona uma nova tarefa'
//     },
//     {
//       name: 'List',
//       value: 'list',
//       description: 'Lista todas as tarefas'
//     },
//     {
//       name: 'Update',
//       value: 'update',
//       description: 'Atualiza a tarefa especificada'
//     },
//     {
//       name: 'Remove',
//       value: 'remove',
//       description: 'Remove a tarefa especificada'
//     },
//     {
//       name: 'Export',
//       value: 'export',
//       description: 'Exporta a base de dados em CSV para o caminho de saída especificado'
//     }
//   ]
// })

// switch (firstSelect) {
//   case 'add': {
//     const title = await input({
//       message: "Título",
//       validate: v => v.length >= 3 || "Mínimo 3 caracteres"
//     })
//     const choice = await checkbox({
//       message: "Selecione as entradas que deseja adicionar",
//       choices: [
//         {name: 'Prioridade', value: '-p'},
//         {name: 'Tags', value: '-t'},
//         {name: 'Projeto', value: '-P'},
//         {name: 'Descrição', value: '-D'}
//       ]
//     })
//     let final = `add`
//     if (choice.includes('-p')) {
//       const prio = await select({
//         message: 'Prioridade',
//         choices: [
//           {name: "Alta", value: 'alta'},
//           {name: 'Média', value: 'media'},
//           {name: 'Baixa', value: 'baixa'}
//         ]
//       })
//       final = `${final} -p ${prio}`
//     }
//     if (choice.includes('-t')) {
//       const tagsBase = await input({
//         message: "Tags (separe com ',' sem espaços)"
//       })
//       const tagsSeparated = tagsBase.split(',')
//       final = `${final} -t ${tagsSeparated}`
//     }
//     if (choice.includes('-P')) {
//       const proj = await input({
//         message: "Projeto"
//       })
//       final = `${final} -P ${proj}`
//     }
//     if (choice.includes('-D')) {
//       const desc = await input({
//         message: "Descrição"
//       })
//       final = `${final} -D ${desc}`
//     }
//     final = `${final} ${title}`

//     program.parse(final)
//   }
//   case 'list': {

//   }
//   case 'update': {

//   }
//   case 'remove': {

//   }
//   case 'export': {

//   }
// }

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

process.on('SIGINT', () => {
  console.log('\nProcesso interrompido.\nEncerrando...');
  process.exit(0);
});

// rl.on('SIGINT', () => {
//   console.log('\nEncerrando...');
//   rl.close();
//   process.exit(0);
// });
