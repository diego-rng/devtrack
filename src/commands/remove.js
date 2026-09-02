import * as db from '../storage/db.js';
import * as queue from './src/services/notifier.js';
import chalk from 'chalk';

export function registerRemove(program) {
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
  
}