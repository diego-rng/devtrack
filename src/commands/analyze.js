import chalk from "chalk";
import os from 'os';
import fs from 'fs/promises';

export function registerAnalyze(program) {
  program
    .command('analyze')
    .description('Analiza os arquivos .log e .csv da pasta.')
    .action(async () => {
      try {
        performance.mark('start-csv');

        const { results: csv, workersUsed: csvUsed } = await processInParallel(
          undefined,
          'csv',
        );

        performance.mark('end-csv');
        performance.measure('csv-full', 'start-csv', 'end-csv');
        const [timeCSV] = performance.getEntriesByName('csv-full');

        performance.mark('start-log');

        const { results: log, workersUsed: logUsed } = await processInParallel(
          undefined,
          'log',
        );

        performance.mark('end-log');
        performance.measure('log-full', 'start-log', 'end-log');
        const [timeLOG] = performance.getEntriesByName('log-full');

        let totalFiles = 0;
        let totalLines = 0;
        let totalSize = 0;

        console.log('CSV:\n');
        for (let i = 0; i < csv.length; i++) {
          console.log(`Number ${i + 1}:`);
          for (const [key, value] of Object.entries(csv[i])) {
            totalFiles++;
            totalLines += csv[i].lines;
            totalSize += csv[i].sizeBytes;
            console.log(`   ${key}: ${value}`);
          }
        }
        console.log('Log:\n');
        for (let i = 0; i < log.length; i++) {
          console.log(`Number ${i + 1}: `);
          for (const [key, value] of Object.entries(log[i])) {
            console.log(`   ${key}: ${value}`);
          }
        }
        console.log('---------------------');
        console.log(
          `Relatório Final:\n   Total de arquivos: ${totalFiles}\n   Total de Linhas: ${totalLines}\n   Tamanho total: ${totalSize} bytes\n   Time needed: ${timeCSV.duration > timeLOG.duration ? timeCSV.duration.toFixed(4) : timeLOG.duration.toFixed(4)}ms\n   Total de Workers usados: ${csvUsed + logUsed}`,
        );
      } catch (err) {
        console.error(chalk.red(`Erro: ${err.message}`));
      }
    });
}

async function processInParallel(file = undefined, type = undefined) {
  const maxWorkers = os.cpus().length;
  const results = [];
  let workersUsed = 0;

  if (file != undefined) {
    const promises = executeWorker(file);
    results.push(...(await Promise.all(promises)));
  } else if (type != undefined) {
    const files = await fs.readdir('./', {
      recursive: true,
      encoding: 'utf-8',
      withFileTypes: true,
    });
    const filtered = files.filter(
      (a) => a.isDirectory() === false && a.name.includes(type),
    );
    let filesDone = 0;
    for (let i = 0; i < filtered.length; i += maxWorkers) {
      workersUsed++;
      const batch = filtered.slice(i, i + maxWorkers);
      const result = batch.map((a) => {
        const filePath = path.join(a.parentPath ?? a.path, a.name);
        return executeWorker(filePath).then((res) => {
          filesDone++;
          console.log(
            `Processando ${filesDone}/${filtered.length} arquivos...`,
          );
          return res;
        });
      });
      results.push(...(await Promise.all(result)));
    }
  } else throw new Error('Missing a required entry');
  return { results, workersUsed };
}


function executeWorker(data) {
  return new Promise((resolve, reject) => {
    let filesDone = 0;
    const w = new Worker(new URL('./workers/fileWorker.js', import.meta.url), {
      workerData: data,
    });
    w.errors = 0;

    w.on('message', resolve);
    w.on('error', (err) => {
      w.errors++;
      console.log(
        `Encountered an error: ${err.message}\n Error number ${w.errors}`,
      );
      reject(err);
    });
    w.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker ended with code ${code}`));
    });
  });
}