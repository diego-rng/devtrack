import { workerData, parentPort } from 'worker_threads';
import fs from 'node:fs/promises';
import { Dirent } from 'node:fs';
import path from 'node:path';

let total
const input = workerData;

const full = await fs.readFile(input, 'utf-8');
total = {
  lines: full.split('\n').length,
  sizeBytes: (await fs.stat(input)).size,
  words: full.split(' ').length,
};

parentPort.postMessage(total);
