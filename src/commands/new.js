import fs from 'node:fs/promises';
import { DB_PATH } from '../storage/db';
import inquirer from 'inquirer';
import * as db from './src/storage/db.js';

export function registerNew(program) {
  program
    .command('new')
    .description('Começa um prompt guiado para criar uma nova tarefa')
    .action(async () => {
      const res = await fs.readFile(DB_PATH, 'utf-8');
      const parsed = await JSON.parse(res).tasks;
      let list = [];
      for (let i = 0; i < parsed.length; i++) {
        const values = Object.entries(parsed[i])
          .filter(([key]) => key === 'projeto')
          .map(([, value]) => {
            if (list.length == 0) {
              return value;
            }
            if (!list.includes([value])) {
              return value;
            }
          });
        list.push(values[0]);
      }
      let fullList = new Array();
      for (let i = 0; i < list.length; i++) {
        const iterator = fullList.values();
        let isTrue = false;
        for (const value of iterator) {
          if (value.name == list[i]) {
            isTrue = true;
          }
        }
        if (isTrue == false) {
          if (list[i].length > 0) {
            fullList.push({ name: list[i], value: list[i] });
          }
        }
      }

      fullList.push({ name: 'Criar novo projeto', value: 'val' });
      try {
        let newProj = new Boolean();
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'titulo',
            message: 'Título da tarefa:',
            validate: (v) =>
              3 <= v.length <= 100 || 'Mínimo 3 caracteres, Máximo 100.',
          },
          {
            type: 'input',
            name: 'descricao',
            message: 'Insira a descrição',
            required: true,
          },
          {
            type: 'select',
            name: 'prioridade',
            message: 'Prioridade:',
            choices: ['alta', 'media', 'baixa'],
          },
          {
            type: 'select',
            name: 'projeto',
            message: 'Projeto:',
            choices: fullList,
            default: 'val',
          },
        ]);
        let projName;
        if (answers.projeto === 'val') {
          projName = await inquirer.prompt({
            type: 'input',
            message: 'Nome do projeto:',
            required: true,
          });
        }
        const tags = await inquirer.prompt({
          type: 'checkbox',
          message: 'Selecione as tags válidas:',
          choices: [
            { name: 'Front-End', value: 'frontend' },
            { name: 'Back-End', value: 'backend' },
            { name: 'Bug', value: 'bug' },
            { name: 'Feature', value: 'feature' },
          ],
        });
        const obj = await {
          titulo: answers.titulo,
          descricao: answers.descricao,
          prioridade: answers.prioridade,
          projeto:
            answers.projeto === 'val'
              ? Object.values(projName)[0]
              : answers.projeto,
          tags: Object.values(tags)[0],
        };
        console.log(obj);
        const ans = await inquirer.prompt({
          type: 'confirm',
          message: 'Criar esta tarefa?',
          default: true,
        });

        if (ans) {
          const task = await db.adicionarTask(obj);
          const iterator = list.toString().split(',');
          const projList = [];
          for (let i = 0; i < iterator.length; i++) {
            if (iterator[i] == task.projeto) {
              projList.push(iterator[i]);
            }
          }
          console.log(
            chalk.green('Tarefa criada! ID: '),
            chalk.cyan(`${task.id}`),
          );
          console.log(
            chalk.green('Projeto'),
            chalk.gray(`${task.projeto}`),
            chalk.green('possui'),
            chalk.gray(answers.projeto === 'val' ? 1 : projList.length),
            chalk.green('tarefas.'),
          );
          return;
        } else return;
      } catch (e) {
        if (e.name === 'ExitPromptError') process.exit(0);
        throw e;
      }
    });
}
