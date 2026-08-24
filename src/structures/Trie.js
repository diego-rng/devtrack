class TrieNode {
  constructor() {
    this.children = new Map();
    this.endOfKey = false;
    this.taskId = null;
  }
}

export default class Trie {
  #root = new TrieNode();
  insert(word, id = null) {
    let no = this.#root;
    for (const ch of word.toLowerCase()) {
      if (!no.children.has(ch)) no.children.set(ch, new TrieNode());
      no = no.children.get(ch);
    }
    no.endOfKey = true;
    no.taskId = id;
  }

  findPrefix(prefix) {
    let no = this.#root;
    for (const ch of prefix.toLowerCase()) {
      if (!no.children.has(ch)) return [];
      no = no.children.get(ch);
    }
    return this.#collect(no, prefix.toLowerCase());
  }

  #collect(no, prefix) {
    const result = [];
    if (no.endOfKey) result.push({word: prefix, id: no.taskId});
    for (const [ch, child] of no.children) result.push(...this.#collect(child, prefix + ch));
    return result;
  }
}

