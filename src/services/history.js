import Stack from '../structures/Stack.js';
import fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { DB_PATH } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const undoPath = path.join(__dirname, path.normalize('../../data/undoStack.json'))
const redoPath = path.join(__dirname, path.normalize('../../data/redoStack.json'))


export const undoStack = new Stack();

export const redoStack = new Stack();

export async function register(act, prevState) {
  try {
    if (!fs.existsSync(undoPath)) {
      await fsp.writeFile(undoPath, '[]');
    }
    const curr = JSON.parse(await fsp.readFile(undoPath, 'utf-8'))
    undoStack.clear()
    curr.forEach(item => {
      undoStack.push(item)
    });
    const conj = { action: act, prevState: prevState };
    undoStack.push(conj);
    await fsp.writeFile(undoPath, JSON.stringify(undoStack.toArray()))
  } catch (err) {
    throw err
  }
}

export async function undo() {
  try {
    if (!fs.existsSync(undoPath)) throw new Error("File doesn't exist")
    let red = []
    if (fs.existsSync(redoPath)) {
      red = JSON.parse(await fsp.readFile(redoPath, 'utf-8'))
      redoStack.clear()
      red.forEach(item => {
        redoStack.push(item)
      })
    }
    const curr = JSON.parse(await fsp.readFile(undoPath, 'utf-8'))
    undoStack.clear()
    curr.forEach(item => {
      undoStack.push(item)
    })
    const conj = undoStack.pop();
    if (!conj) throw new Error("File doesn't exist")

    const currentState = fs.readFileSync(DB_PATH, 'utf-8');
    redoStack.push({ action: conj.action, prevState: currentState})
    await fsp.writeFile(undoPath, JSON.stringify(undoStack.toArray()))
    await fsp.writeFile(redoPath, JSON.stringify(redoStack.toArray()))
    fs.writeFileSync(DB_PATH, conj.prevState);
  } catch (err) {
    throw err;
  }
}

export async function redo() {
  try {
    if (!fs.existsSync(redoPath)) throw new Error("File doesn't exist")
    let und = []
    if (fs.existsSync(undoPath)) {
      und = JSON.parse(await fsp.readFile(undoPath, 'utf-8'))
      undoStack.clear()
      und.forEach(item => {
        undoStack.push(item)
      })
    }
    const curr = JSON.parse(await fsp.readFile(redoPath, 'utf-8'))
    redoStack.clear()
    curr.forEach(item => {
      redoStack.push(item)
    })
    const conj = redoStack.pop();
    if (!conj) throw new Error("File doesn't exist")

    const currentState = fs.readFileSync(DB_PATH, 'utf-8');
    undoStack.push({ action: conj.action, prevState: currentState})
    await fsp.writeFile(redoPath, JSON.stringify(redoStack.toArray()))
    await fsp.writeFile(undoPath, JSON.stringify(undoStack.toArray()))
    fs.writeFileSync(DB_PATH, conj.prevState);
  } catch (err) {
    throw err;
  }
}
