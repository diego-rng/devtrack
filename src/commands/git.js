import ora from "ora";
import chalk from "chalk";
import * as git from '../services/git';

export function registerGit(program) {
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
}