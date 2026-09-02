import { readEnv } from "../utils/config";
import chalk from "chalk";

const config = readEnv();

export function registerQueue(program) {
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
}
