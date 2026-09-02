import chalk from 'chalk';
import * as db from '../storage/db.js';
import * as queue from './src/services/notifier.js';

export function registerAdd(program) {
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
      queue.enqueue({
        type: 'add',
        payload: full,
        attempts: 0,
        createdAt: new Date(),
      });
      await queue.processar();
      process.exit(0);
    });
}
