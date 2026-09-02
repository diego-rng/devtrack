import { parseJSON } from "../../cli";
import chalk from "chalk";


export function registerList(program) {
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

}