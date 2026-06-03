import Stack from '../structures/Stack.js';
import fs from 'fs';

import { DB_PATH } from '../storage/db.js';

export const undoStack = new Stack();

export const redoStack = new Stack();

export async function register(act, prevState) {
  const conj = {action: act, prevState: prevState}
  undoStack.push(conj);
}

export async function undo() {
  try {
    const conj = undoStack.pop();
    redoStack.push(conj);
    fs.writeFileSync(DB_PATH, conj.prevState);
  } catch (err) {
    throw err;
  }
}

export async function redo() {
  try {
    const conj = redoStack.pop();
    undoStack.push(conj);
    fs.writeFileSync(DB_PATH, conj.prevState);
  } catch (err) {
    throw err;
  }
}
