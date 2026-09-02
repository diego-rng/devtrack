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

registerTimeline(program);


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
