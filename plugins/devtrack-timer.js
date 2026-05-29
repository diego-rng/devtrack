import fs from 'node:fs/promises';
import path from 'path';
import { DB_PATH } from '../src/storage/db.js';

export default {
  nome: 'timer',
  versao: '1.0',
  comandos: [
    (program) =>
      program
        .command('timer start')
        .description('Salva a data e horário do início da tarefa especificada')
        .argument('<id>')
        .action(async (id) => {
          const content = await JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
          if (!content.tasks.some((task) => task.id === id)) {
            throw new Error('No task matches the ID provided');
          }
          const identifier = content.tasks.findIndex((cont) => cont.id === id);
          content.tasks[identifier].startTime = new Date();

          await writeFile(DB_PATH, JSON.stringify(content, null, 2));
        }),
    (program) =>
      program
        .command('timer stop')
        .description('Calcula o tempo gasto na tarefa')
        .argument('<id>')
        .action(async (id) => {
          const content = await JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
          if (!content.tasks.some((task) => task.id === id)) {
            throw new Error('No task matches the ID provided');
          }
          const identifier = content.tasks.findIndex((cont) => cont.id === id);
          if (!content.tasks[identifier].startTime) {
            throw new Error('Task timer was never started');
          }
          const stopTime = Date.now();

          content.tasks[identifier].timeSpent = (
            stopTime - Date.parse(content.tasks[identifier].startTime)
          ).toUTCString();

          await writeFile(DB_PATH, JSON.stringify(content, null, 2));
        }),
  ],
};
