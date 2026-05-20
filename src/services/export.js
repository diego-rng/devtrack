import { Transform, Readable } from 'node:stream';

import * as zlib from 'zlib';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import * as db from '../storage/db.js';
import readline from 'node:readline/promises';
import { pipeline } from 'node:stream/promises';
import { createWriteStream, createReadStream, readFileSync } from 'node:fs';

const DB_PATH = path.normalize('.\\data\\devtrack.json');

export async function exportarCSV(filtro, caminhoSaida) {
  try {
    const original = await fs.readFile(DB_PATH, 'utf-8')
    if (!original) {
      throw new Error("Couldn't read DB")
    }
    let updated = await JSON.parse(original)
    const currentDate = new Date();

    if (filtro != undefined) {
      if (filtro.titulo != undefined) {
        updated = updated.tasks.filter((a) => a.titulo === filtro.titulo);
      }
      if (filtro.descricao != undefined) {
        updated = updated.tasks.filter((a) => a.descricao === filtro.descricao);
      }
      if (filtro.status != undefined) {
        updated = updated.tasks.filter((a) => a.status === filtro.status);
      }
      if (filtro.prioridade != undefined) {
        updated = updated.tasks.filter((a) => a.prioridade === filtro.prioridade);
      }
      if (filtro.projeto != undefined) {
        updated = updated.tasks.filter((a) => a.projeto === filtro.projeto);
      }
      if (filtro.tags != undefined) {
        updated = updated.tasks.filter((a) => !a.tags.includes(filtro.tags));
      }
    }

    let transformed = ``;
    if ((updated != null | undefined) || updated.length != 0) {
      Object.keys(updated[0])
        .filter((key) => key !== 'atualizadaEm')
        .forEach((key) => {
          transformed =
            transformed.length === 0 ? key : `${transformed},${key}`;
        });
      for (let i = 0; i < updated.length; i++) {
        const values = Object.entries(updated[i])
          .filter(([key]) => key !== 'atualizadaEm')
          .map(([, value]) => {
            if (value === null) return '<null>';
            if (Array.isArray(value))
              return value.length === 0 ? '[]' : `"[${value.join(', ')}]"`;
            return value;
          });
        transformed = `${transformed}\n${values.join(', ')}`;
      }
    } else {
      transformed = 'titulo,status,prioridade,projeto,tags,id,criadaEm';
    }
    console.log(typeof updated)
    await fs.writeFile(path.normalize(caminhoSaida), transformed);
    return true
  } catch (err) {
    console.error(err);
    throw new Error(err)
  }
}

export async function exportarLogComprimido(caminhoSaida) {
  const gzip = zlib.createGzip();
  const original = (await JSON.parse(await fs.readFile(DB_PATH, 'utf-8'))).log;
  const readable = Readable.from(original);
  const currentDate = new Date();
  const destination = createWriteStream(path.normalize(caminhoSaida));
  await pipeline(readable, gzip, destination);
}
