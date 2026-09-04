class Node {
  constructor(value, prev = null, next = null) {
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
}

export default class DoublyLinkedList {
  constructor() {
    this.count = 0;
    this.head = undefined;
    this.tail = undefined;
  }
  pushFront(v) {
    const node = new Node(v, this.head);
    let current;
    if (this.head !== undefined) {
      current = this.head;
      current.prev = node;
    }
    this.head = node;
    if (!this.tail) this.tail = this.head;
    if (!this.head.next && this.tail) this.head.next = this.tail;
    this.count++;
  }
  pushBack(v) {
    const node = new Node(v, null, this.tail);
    let current;
    if (this.tail !== undefined) {
      current = this.tail;
      current.next = node;
    }
    this.tail = node;
    if (!this.head) this.head = this.tail;
    if (!this.tail.prev && this.head) this.tail.prev = this.head;
    this.count++;
  }
  popFront() {
    if (this.head == undefined) return undefined;
    let current = this.head;
    this.head = current.next;
    current.next = null;
    this.count--;
    return current.value;
  }
  popBack() {
    if (this.tail == undefined) return undefined;
    let current = this.tail;
    this.tail = current.prev;
    current.prev = null;
    this.count--;
    return current.value;
  }
  search(pred) {
    let current = this.head;
    for (let i = 0; i < this.size; i++) {
      if (pred(current.value)) return current.value;
      if (current == this.tail) return null;
      current = current.next;
    }
    return null;
  }
  get size() {
    return this.count;
  }
  toArray() {
    const res = [];
    if (this.size == 0) return res;
    let latest = this.head;
    for (let i = 0; i < this.size; i++) {
      if (latest == undefined) break;
      res.push(latest.value);
      latest = latest.next;
    }
    return res;
  }
  toReverseArray() {
    const res = [];
    if (this.size == 0) return res;
    let latest = this.head;
    for (let i = 0; i < this.size; i++) {
      if (latest == undefined) break;
      res.push(latest.value);
      latest = latest.next;
    }
    return res.toReversed();
  }
  paginate(page, perPage = 10) {
    const res = [];
    if (this.size == 0) return res;
    let latest = this.head;
    const pagesPassed = () => {
      if (page <= 1) return 0;
      return (page - 1) * perPage;
    };
    if (pagesPassed() > this.size) return res;
    let limit = page * perPage;
    if (limit > this.size) limit = this.size;
    if (page <= 0) limit = perPage;
    let untilPage = limit;
    if (limit < 1) {
      res.push(latest.value);
    } else {
      for (let i = 0; i < limit; i++) {
        if (i < pagesPassed()) {
          latest = latest.next;
          untilPage--;
          continue;
        }
        if (untilPage === 0) break;
        res.push(latest.value);
        if (!latest.next || latest.next == undefined) break;
        latest = latest.next;
        untilPage--;
      }
    }
    return res;
  }
}
