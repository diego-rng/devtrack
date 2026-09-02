import * as db from './src/storage/db.js';
import chalk from 'chalk';
import { search } from '@inquirer/prompts';

export function registerSearch(program) {
  program
    .command('search')
    .description('Pesquisa a base de dados por tarefas')
    .argument('[prefix]')
    .action(async (prefix) => {
      if (prefix) {
        await db.onStart();
        console.log(db.db);
        const res = db.db.findPrefix(prefix);
        if (!res.size) {
          console.log(chalk.redBright('Nenhum resultado encontrado'));
          return;
        }
        console.log(
          chalk.greenBright(`${res.size} resultados encontrados! \n`),
        );
        for (result in res) {
          console.log(chalk.cyan(result));
        }
        process.exit(0);
      } else {
        await db.onStart();
        console.log(db.db);
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
}
