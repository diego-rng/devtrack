import chalk from 'chalk';
import Queue from '../structures/Queue.js';
import { readEnv } from '../utils/config.js';

const processes = new Queue();
const deadLetterQueue = new Queue();
let processed = 0;
const MAX_ATTEMPTS = 3
export async function processar() {
  const temp = processes.dequeue();
  const url = readEnv().webhookURL;
  let done = false
  for (let i = 0; i <= MAX_ATTEMPTS; i++) {
    try {
      if (done) {
        break
      }
      const res = await fetch(url, 
      {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(temp)
      }).then(() => {
        done = true
        return;
      }, (reason) => {
        throw new Error(reason)
      });
      if (!res.ok) { throw new Error(res.status) }
    } catch (err) {
      if (done) return
      if (temp.attempts < 3) {
        temp.attempts++;
        processes.enqueue(temp);
        console.error(chalk.red(`Attempt number ${temp.attempts} failed! Retrying!`))
      } else {
        console.error(chalk.red("Reattempted three times with no luck. Ending..."))
        deadLetterQueue.enqueue(temp);
        console.error(chalk.red(err));
      }
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