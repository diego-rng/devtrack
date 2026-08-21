export default class Stack {
  #items = [];

  constructor() {}
  push(item) {
    this.#items.push(item);
    if (this.#items.length >= 51) {
      const temp = this.toArray().slice(1);
      this.#items = temp;
    }
  }

  pop() {
    return this.#items.pop();
  }

  peek() {
    return this.#items[this.#items.length - 1];
  }

  isEmpty() {
    return this.#items.length === 0;
  }

  get size() {
    return this.#items.length;
  }

  clear() {
    this.#items = [];
  }

  toArray() {
    return this.#items;
  }
}
