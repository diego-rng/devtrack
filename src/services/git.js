import * as child from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(child.exec);

export async function getBranch() {
  try {
    const { stdout } = await execASync('git branch --show-current', {
      cwd: process.cwd(),
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getUltimoCommit() {
  try {
    const { stdout } = await execAsync(
      'git log --pretty=format:"%H|%s|%an|%ai" -1',
      {
        cwd: process.cwd(),
      },
    );
    const [hash, mensagem, autor, data] = stdout.split(`|`);

    return { hash, mensagem, autor, data };
  } catch (err) {
    console.error(err);
  }
}

export async function getStatusArquivos() {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: process.cwd(),
    });
    if (stdout === '') return [];
    const sep = stdout.split('\n');
    const lines = sep.length;
    const res = [];
    for (let i = 0; i < lines; i++) {
      if (!sep[i]) break;
      let status = sep[i].slice(0, 2);
      if (status.at(0) == '') {
        status = status.slice(0)
      } else {status = status.slice(1)}
      const file = sep[i].slice(3);
      res.push({ status: status, arquivo: file });
    }
    console.log(res)
    return res;
  } catch (err) {
    console.error(err);
  }
}

export async function criarBranchDaTarefa(id, titulo) {
  try {
    if (!id | !titulo) {
        throw new Error(`Missing ID or Title.`)
    }
    const slug = titulo.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
    const id8 = id.slice(0, 8);
    const { stdout } = await execAsync(`git branch feat/DT-${id8}-${slug}`);
  } catch (err) {
    console.error(err)
  }
}