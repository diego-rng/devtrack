import Queue from '../structures/Queue.js';
import { readEnv } from '../utils/config.js';

const processes = new Queue();
const deadLetterQueue = new Queue();
let processed = 0;
export function processar() {
  const temp = processes.dequeue();
  try {
    fetch(readEnv().webhookURL);
  } catch (err) {
    if (temp.attempts < 3) {
      temp.attempts++;
      processes.enqueue(temp);
    } else {
      deadLetterQueue.enqueue(temp);
      console.error(err);
    }
  }
}
export function iniciarProcessamento(ms) {
  setInterval(() => {
    processar()
  }, ms)
}

export function stats() {
  const full = {
    pending: processes,
    deadLetter: deadLetterQueue,
    processed: processed
  };
  return full;
}

export function enqueue(event) {
  processes.enqueue(event)
} 