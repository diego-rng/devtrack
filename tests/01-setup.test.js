import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

describe('Tarefa 01 — package.json', () => {
  test('type é "module" (ESM habilitado)', () => {
    assert.equal(pkg.type, 'module');
  });

  test('bin aponta para ./cli.js', () => {
    assert.deepEqual(pkg.bin, { devtrack: './cli.js' });
  });

  test('engines exige node >=18', () => {
    assert.ok(pkg.engines?.node, 'engines.node deve existir');
    assert.match(pkg.engines.node, />=18/);
  });

  test('scripts: start existe', () => {
    assert.ok(pkg.scripts?.start, 'script start deve existir');
  });

  test('scripts: dev existe', () => {
    assert.ok(pkg.scripts?.dev, 'script dev deve existir');
  });

  test('scripts: test existe', () => {
    assert.ok(pkg.scripts?.test, 'script test deve existir');
  });
});

describe('Tarefa 01 — arquivos obrigatórios', () => {
  test('cli.js existe', () => {
    assert.ok(existsSync(path.join(ROOT, 'cli.js')), 'cli.js deve existir');
  });

  test('.gitignore existe', () => {
    assert.ok(existsSync(path.join(ROOT, '.gitignore')), '.gitignore deve existir');
  });

  test('.gitignore contém node_modules/', () => {
    const conteudo = readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    assert.ok(conteudo.includes('node_modules/'), '.gitignore deve ignorar node_modules/');
  });

  test('.gitignore contém .env', () => {
    const conteudo = readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    assert.ok(conteudo.includes('.env'), '.gitignore deve ignorar .env');
  });

  test('.env.example existe', () => {
    assert.ok(existsSync(path.join(ROOT, '.env.example')), '.env.example deve existir');
  });

  test('data/devtrack.json existe e é JSON válido', () => {
    const dbPath = path.join(ROOT, 'data', 'devtrack.json');
    assert.ok(existsSync(dbPath), 'data/devtrack.json deve existir');
    const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
    assert.ok(Array.isArray(db.projects), 'db.projects deve ser array');
    assert.ok(Array.isArray(db.tasks), 'db.tasks deve ser array');
    assert.ok(Array.isArray(db.log), 'db.log deve ser array');
    assert.ok(db.version, 'db.version deve existir');
  });
});

describe('Tarefa 01 — estrutura de diretórios', () => {
  const dirs = [
    'src/storage',
    'src/services',
    'src/structures',
    'src/server',
    'src/utils',
    'src/commands',
    'workers',
    'plugins',
    'exports',
    'scripts',
  ];

  for (const dir of dirs) {
    test(`diretório ${dir} existe`, () => {
      assert.ok(
        existsSync(path.join(ROOT, dir)),
        `${dir} deve existir`
      );
    });
  }
});
