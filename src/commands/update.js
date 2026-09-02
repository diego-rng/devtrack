import * as db from '../storage/db.js';
import * as queue from './src/services/notifier.js';
import chalk from 'chalk';
export function registerUpdate(program) {
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
        queue.enqueue({
          type: 'update',
          payload: full,
          attempts: 0,
          createdAt: new Date(),
        });
        await queue.processar();
        process.exit(0);
      } catch (err) {
        console.error(chalk.red.bold(err));
      }
    });
}
