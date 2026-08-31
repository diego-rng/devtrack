class Node {
  constructor (value, prev = null, next = null) {
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
}

export default class DoublyLinkedList{
  constructor(value, prev, next) {
    this.count = 0;
    this.head = undefined;
    this.tail = undefined;
  }
  pushFront(v){
    const node = new Node(v, this.head);
    let current;
    if (this.head == null) {
      this.head = node
    } else {
      current = this.head;
      while (current.next != null) {
        current = current.next;
      }
      current.next = node;
    }
    this.count++
  }
  pushBack(v){
    const node = new Node(v, null, this.tail);
    let current;
    if (this.tail == null) {
      this.tail = node
    } else {
      current = this.tail;
      while (current.prev != null) {
        current = current.prev;
      }
      current.prev = node;
    }
    this.count++
  }
  popFront() {
    if (this.head == undefined) return undefined;
    let current = this.head;
    this.head = current.next;
    current.next = null
    this.count--
    return current
  }
  popBack() {
    if (this.tail == undefined) return undefined;
    let current = this.tail;
    this.tail = current.prev;
    current.prev = null
    this.count--
    return current
  }
  search(pred) {
    let current = this.head;
    while (current.value !== pred) {
      current = current.next
      if (current == this.tail) return undefined
    }
    return current
  }
  get size() {
    return this.count;
  }
  toArray(){
    const res = []
    if (this.size() == 0) return res
    let latest = this.head
    while (latest !== this.tail) {
      res.push(latest)
      latest = latest.next
    }
    return res
  }
  toReverseArray(){
    const res = []
    if (this.size() == 0) return res
    let latest = this.tail
    while (latest !== this.tail) {
      res.push(latest)
      latest = latest.prev
    }
    return res
  }
}