import { readEnv } from './src/utils/config.js';
import { buscarIssues } from './src/services/github.js';
import chalk from 'chalk';
import ora from "ora";

const config = readEnv();

export function registerGithub(program) {
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
        config.githubToken,
      );
      console.log(full);
    } catch (err) {
      spinner.fail(chalk.red(`Erro: ${err.message}`));
    }
  });
}