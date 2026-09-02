import * as hist from './src/services/history.js';

export function registerUndo(program) {
  program
    .command('undo')
    .description('Desfaz a última mudança')
    .action(async () => {
      try {
        await hist
          .undo()
          .then(() => console.log('Alteração desfeita com sucesso!'));
      } catch (err) {
        if (err.message === "File doesn't exist") {
          console.log('Nada para desfazer');
          process.exit(0);
        }
        console.error(err);
      }
    });
}
