import ora from "ora";
import chalk from "chalk";
import * as imp from './src/services/export.js';

export function registerExport(program) {
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
}
