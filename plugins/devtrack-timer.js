import fs from 'node:fs/promises';
import path from 'path';
import { DB_PATH } from '../src/storage/db.js';

export default {
  nome: 'timer',
  versao: '1.0',
  comandos: [
    (program) =>
      program
        .command('timer')
        .description(
          'Salva a data e horário do início da tarefa especificada ou Calcula o tempo gasto na tarefa',
        )
        .argument('<opt>', 'start|stop')
        .argument('<id>')
        .action(async (opt, id) => {
          switch (opt) {
            case 'start': {
              const content = await JSON.parse(
                await fs.readFile(DB_PATH, 'utf-8'),
              );
              if (!content.tasks.some((task) => task.id === id)) {
                throw new Error('No task matches the ID provided');
              }
              const identifier = content.tasks.findIndex(
                (cont) => cont.id === id,
              );
              content.tasks[identifier].startTime = new Date();
              content.tasks[identifier].atualizadaEm = new Date();

              await fs.writeFile(DB_PATH, JSON.stringify(content, null, 2));
              break; 
            }
            case 'stop': {
              const content = await JSON.parse(
                await fs.readFile(DB_PATH, 'utf-8'),
              );
              if (!content.tasks.some((task) => task.id === id)) {
                throw new Error('No task matches the ID provided');
              }
              const identifier = content.tasks.findIndex(
                (cont) => cont.id === id,
              );
              if (!content.tasks[identifier].startTime) {
                throw new Error('Task timer was never started');
              }
              const stopTime = Date.now();

              const timeMs = stopTime - Date.parse(content.tasks[identifier].startTime);

              content.tasks[identifier].timeSpent = formatDuration(timeMs)
              content.tasks[identifier].atualizadaEm = new Date();

              await fs.writeFile(DB_PATH, JSON.stringify(content, null, 2));
              break;
            }
          }
        }),
  ],
};


function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}