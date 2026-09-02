import * as hist from './src/services/history.js';

export function registerRedo(program) {
  program
    .command('redo')
    .description('Refaz a última coisa desfeita')
    .action(async () => {
      try {
        await hist
          .redo()
          .then(() => console.log('Alteração refeita com sucesso!'));
      } catch (err) {
        if (err.message === "File doesn't exist") {
          console.log('Nada para refazer');
          process.exit(0);
        }
        console.error(err);
      }
    });
}
