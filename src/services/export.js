import { pipeline } from 'node:stream/promises';
import * as db from '../storage/db.js';
import readline from 'node:readline/promises';
import fs from 'node:fs/promises';

const rl = readline.createInterface({ input, output });

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

const writableStream = new WritableStream({
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

const writer = new WritableStream(new writableStream());

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

export async function exportarCSV(filtro, caminhoSaida) {}
