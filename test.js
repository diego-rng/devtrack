#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTS_SRC = path.join(__dirname, 'tests');

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('Caminho do projeto do aluno: ', (input) => {
  rl.close();

  const raw = input.trim().replace(/^['"]|['"]$/g, '');
  const projectPath = path.resolve(process.cwd(), raw);

  if (!existsSync(projectPath)) {
    console.error(`\nCaminho não encontrado: ${projectPath}`);
    process.exit(1);
  }

  const testsDest = path.join(projectPath, 'tests');
  const alreadyExists = existsSync(testsDest);

  if (!alreadyExists) {
    cpSync(TESTS_SRC, testsDest, { recursive: true });
  }

  const allFiles = readdirSync(testsDest)
    .filter(f => f.endsWith('.test.js'))
    .sort();

  console.log('\nArquivos disponíveis:');
  console.log('  0) Todos');
  allFiles.forEach((f, i) => console.log(`  ${i + 1}) ${f}`));

  const rl2 = createInterface({ input: process.stdin, output: process.stdout });
  rl2.question('\nQual rodar? (número ou Enter para todos): ', (choice) => {
    rl2.close();

    const idx = parseInt(choice.trim(), 10);
    const selected = (!choice.trim() || idx === 0)
      ? allFiles
      : allFiles[idx - 1]
        ? [allFiles[idx - 1]]
        : allFiles;

    const testFiles = selected.map(f => path.join(testsDest, f));

    console.log(`\nRodando: ${selected.join(', ')}\nem: ${projectPath}\n`);

    const result = spawnSync(
      process.execPath,
      ['--test', '--test-reporter', 'spec', ...testFiles],
      { cwd: projectPath, stdio: 'inherit' }
    );

    if (!alreadyExists) {
      rmSync(testsDest, { recursive: true, force: true });
    }

    process.exit(result.status ?? 1);
  });
});
 