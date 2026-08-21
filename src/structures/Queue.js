export default class Queue {
  #store = Object;
  #head = Number
  #tail = Number
  constructor() {
    this.#store = {}; 
    this.#head = 0;
    this.#tail = 0; 
  }
  enqueue(item) {
    this.#store[this.#head] = item;
    this.#head++;
  }
  dequeue() {
    if (this.isEmpty()) {
      return undefined;
    }
    const result = this.#store[this.#tail];
    delete this.#store[this.#tail];
    this.#tail++;
    return result
  }
  peek() {
    if (this.isEmpty()) {
      return undefined
    }
    return this.#store[this.#tail]
  }
  isEmpty() {
    return this.size() === 0
  }
  get size() {
    return this.#head - this.#tail
  }
}