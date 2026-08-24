export default class Queue {
  #store = {};
  #head = 0
  #tail = 0
  constructor() {
    this.#store = {}; 
    this.#head = 0;
    this.#tail = 0; 
  }
  enqueue(item) {
    this.#store[this.#tail] = item;
    this.#tail++;
  }
  dequeue() {
    if (this.isEmpty()) {
      return undefined;
    }
    const result = this.#store[this.#head];
    delete this.#store[this.#head];
    this.#head++;
    return result
  }
  peek() {
    if (this.isEmpty()) {
      return undefined
    }
    return this.#store[this.#head]
  }
  isEmpty() {
    return this.#head === this.#tail;
  }
  get size() {
    return this.#tail - this.#head
  }
}
