import { Transform, Readable } from 'node:stream';

import { pipeline } from 'node:stream/promises';
import * as db from '../storage/db.js';
import readline from 'node:readline/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream, createReadStream } from 'node:fs';

const DB_PATH = path.normalize('./data/devtrack.json');

export async function exportarCSV(filtro, caminhoSaida) {
  const original = (await JSON.parse(await fs.readFile(DB_PATH, 'utf-8')))
    .tasks;
  const currentDate = new Date();
  

  let transformed = ``;
  Object.keys(original[0]).filter(key => key !== 'atualizadaEm').forEach((key) => {
    transformed = transformed.length === 0 ? key : `${transformed}; ${key}`;
  });

  for (let i = 0; i < original.length; i++) {
    const values = Object.entries(original[i]).filter(([key]) => key !== 'atualizadaEm').map(([, value]) => {
        if (value === null) return '<null>';
        if (Array.isArray(value))
          return value.length === 0 ? '[]' : `[${value.join(', ')}]`;
        return value;
      });
    transformed = `${transformed}\n${values.join('; ')}`;
  }
  await fs.writeFile(path.normalize('./exports/devtrack-' + currentDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
      ) + '.csv', transformed)
}

exportarCSV();
