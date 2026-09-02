#!/usr/bin/env node
// cli.js - Entry point do DevTrack
import path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'node:fs/promises';

import { ac } from './src/server/index.js';
import { registerAdd } from './src/commands/add.js';
import { registerList } from './src/commands/list.js';
import { registerUpdate } from './src/commands/update.js';
import { registerRemove } from './src/commands/remove.js';
import { registerExport } from './src/commands/export.js';
import { registerGithub } from './src/commands/github.js';
import { registerGit } from './src/commands/git.js';
import { registerNew } from './src/commands/new.js';
import { registerServe } from './src/commands/serve.js';
import { registerAnalyze } from './src/commands/analyze.js';
import { registerConfig } from './src/commands/config.js';
import { registerUndo } from './src/commands/undo.js';
import { registerRedo } from './src/commands/redo.js';
import { registerQueue } from './src/commands/queue.js';
import { registerSearch } from './src/commands/search.js';
import { registerTimeline } from './src/commands/timeline.js';

console.log('DevTrack v1.0');
console.log('Node:', process.version);
console.log('Plataforma:', process.platform);

const program = new Command()
  .name('devtrack')
  .description('CLI para gerenciamento de projetos')
  .version('1.0.0');

const DB_PATH = path.normalize('./data/devtrack.json');

registerAdd(program);

registerList(program);

registerUpdate(program);

registerRemove(program);

registerExport(program);

registerGithub(program);

registerGit(program);

registerNew(program);

registerServe(program);

registerAnalyze(program);

registerConfig(program);

registerUndo(program);

registerRedo(program);

registerQueue(program);

registerSearch(program);


program
  .command('remove <id>')
  .description('Remove a tarefa especificada')
  .action(async (id) => {
    try {
      await db.removerTask(id);
      queue.enqueue({
        type: 'delete',
        payload: id,
        attempts: 0,
        createdAt: new Date(),
      });
      await queue.processar();
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
    try {
      await hist
        .undo()
        .then(() => console.log('Alteração desfeita com sucesso!'));
    } catch (err) {
      if (err.message === "File doesn't exist") {
        console.log('Nada para desfazer');
        process.exit(0);
      }
      console.error(err);
    }
  });

// #region redo command

program
  .command('redo')
  .description('Refaz a última coisa desfeita')
  .action(async () => {
    try {
      await hist
        .redo()
        .then(() => console.log('Alteração refeita com sucesso!'));
    } catch (err) {
      if (err.message === "File doesn't exist") {
        console.log('Nada para refazer');
        process.exit(0);
      }
      console.error(err);
    }
  });

// #region queue command

program
  .command('queue')
  .description('Gerencia a fila de notificações de webhooks')
  .option('--stats', 'Exibe estatísticas da fila')
  .action(async (opts) => {
    if (!opts.stats) {
      console.log('Use --stats para exibir as estatísticas da fila.');
      const res = await fetch(config.webhookURL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => {
        throw new Error(err);
      });
      console.log(res);
      for (const obj in res.body) {
        console.log(`[x] ${obj.payload.id}`);
      }
      return;
    }
    const stats = queue.stats();
    console.log(chalk.bold('\n Stats:'));
    console.log(`Pendentes:  ${chalk.cyan(stats.pending.size)}`);
    console.log(`Dead-Letter:  ${chalk.red(stats.deadLetter.size)}`);
    console.log(`Processados: ${chalk.green(stats.processed)}`);
    process.exit(0);
  });

// #region search command

program
  .command('search')
  .description('Pesquisa a base de dados por tarefas')
  .argument('[prefix]')
  .action(async (prefix) => {
    if (prefix) {
      await db.onStart()
      console.log(db.db)
      const res = db.db.findPrefix(prefix);
      if (!res.size) {
        console.log(chalk.redBright('Nenhum resultado encontrado'));
        return;
      }
      console.log(chalk.greenBright(`${res.size} resultados encontrados! \n`));
      for (result in res) {
        console.log(chalk.cyan(result));
      }
      process.exit(0);
    } else {
      await db.onStart()
      console.log(db.db)
      const res = await search({
        message: 'Escreva o seu prefixo',
        source: (input) => {
          if (!input) {
            return db.db.findPrefix('');
          }

          const data = db.db.findPrefix(input);

          return data.map((pkg) => ({
            name: pkg.titulo,
            value: pkg.titulo,
            description: pkg.taskId,
          }));
        },
      });
    }
  });

async function main() {
  await pluginCall();
  program.parse(process.argv);
}

main().catch((err) => {
  console.error(chalk.red(err.message));
  process.exit(1);
});

export async function parseJSON(raw) {
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

function registerPlugin(mod) {
  if (mod.comandos.length === 0) return;

  mod.comandos.forEach((register) => register(program));
}

process.on('SIGINT', () => {
  console.log('\nProcesso interrompido.\nEncerrando...');
  ac.abort();
  process.exit(0);
});
