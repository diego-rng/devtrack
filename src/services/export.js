import {Transform, Readable} from 'node:stream'
import { pipeline } from 'node:stream/promises';
import * as db from '../storage/db.js';
import readline from 'node:readline/promises';
import fs from 'node:fs/promises';
import path from 'node:path'
import { createWriteStream, createReadStream } from 'node:fs';


const DB_PATH = path.normalize('./data/devtrack.json');

const readableStream = new ReadableStream({
  start(controller) {
    console.log('Readable stream started!');
  },
  pull(controller) {
    console.log('Pull called');
  },
  cancel(reason) {
    console.log(`Readable stream cancelled. Reason: ${reason}`)
  }
});

const writableStream = createWriteStream({
  start(controller) {
    console.log('Writable Stream started!');
  },

  async write(chunk, controller) {
    console.log(`Now writing ${chunk}`)

    await new Promise((resolve) =>
      setTimeout(() => {
        document.body.textContent += chunk;
        resolve();
      }, 1_000),
    );
  },
  close(controller) {
    console.log('Closing...');
  },
  abort(reason) {
    console.log(`Writer aborted. Reason: ${reason}`)
  },
});

const readStream = new ReadableStream(new readableStream());

const writer = new writableStream();

async function transformCSV() {
  const content = await fetch(DB_PATH);
  let result = '';
  const reader = readStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return result;
    result += value;
    console.log(`Read ${result.length} characters so far`);
    console.log(`Most recently read chunk: ${value}`);
  }
}

export async function exportarCSV(filtro, caminhoSaida) {
    const result = transformCSV()
    console.log(result)
}


exportarCSV()