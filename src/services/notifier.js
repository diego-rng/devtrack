import Queue from '../structures/Queue';
import { readEnv } from '../utils/config';

const events = new Queue();

const deadLetterQueue = new Queue();

export async function process() {
  let att = 0
  while (true) {
    try {
      const next = events.dequeue();
      const get = await fetch(readEnv().webhookURL);
    } catch (err) {
      if (++att == 3) {
        deadLetterQueue.enqueue(next)
        throw err
      }
    }
  }
}


export async function startProcessing() {
  
}