import { Transform, Readable } from 'node:stream';

import * as zlib from 'zlib'
import path from 'node:path';
import fs from 'node:fs/promises';
import * as db from '../storage/db.js';
import readline from 'node:readline/promises';
import { pipeline } from 'node:stream/promises';
import { createWriteStream, createReadStream } from 'node:fs';

const DB_PATH = path.normalize('./data/devtrack.json');

export async function exportarCSV(filtro, caminhoSaida) {
  let original = (await JSON.parse(await fs.readFile(DB_PATH, 'utf-8')))
    .tasks;
  const currentDate = new Date();

  if (filtro != undefined) {
    if (filtro.titulo != undefined) {
      original = original.filter((a) => a.titulo === filtro.titulo);
    }
    if (filtro.descricao != undefined) {
      original = original.filter(
        (a) => a.descricao === filtro.descricao,
      );
    }
    if (filtro.status != undefined) {
      original = original.filter((a) => a.status === filtro.status);
    }
    if (filtro.prioridade != undefined) {
      original = original.filter(
        (a) => a.prioridade === filtro.prioridade,
      );
    }
    if (filtro.projeto != undefined) {
      original = original.filter((a) => a.projeto === filtro.projeto);
    }
    if (filtro.tags != undefined) {
      original = original.filter(
        (a) => !a.tags.includes(filtro.tags),
      );
    }
  }

  let transformed = ``;
  if (original != null | undefined || original.length != 0) {
    Object.keys(original[0])
    .filter((key) => key !== 'atualizadaEm')
    .forEach((key) => {
      transformed = transformed.length === 0 ? key : `${transformed},${key}`;
    });
    
    for (let i = 0; i < original.length; i++) {
      const values = Object.entries(original[i])
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
    transformed = 'titulo,status,prioridade,projeto,tags,id,criadaEm'
  }
    await fs.writeFile(
      path.normalize(
        caminhoSaida
      ),
      transformed,
    );
}

export async function exportarLogComprimido(caminhoSaida) {
  const gzip = zlib.createGzip()
  const original = (await JSON.parse(await fs.readFile(DB_PATH, 'utf-8'))).log
  const readable = Readable.from(original)
  const currentDate = new Date();
  const destination = createWriteStream(path.normalize(caminhoSaida))
  await pipeline(readable, gzip, destination)
}

