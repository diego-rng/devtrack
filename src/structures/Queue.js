export default class Queue {
  #store = {};
  #head = 0;
  #tail = 0;

  enqueue(item) {
    this.#store[this.#tail] = item;
    this.#tail++;
  }
  dequeue() {
    if (this.isEmpty()) return undefined;
    const item = this.#store[this.#head];
    delete this.#store[this.#head]; // Liberar memória
    this.#head++;
    return item;
  }

  peek() {
    return this.#store[this.#head];
  }

  isEmpty() {
    return this.#head === this.#tail;
  }

  get size() {
    return this.#tail - this.#head;
  }
}
