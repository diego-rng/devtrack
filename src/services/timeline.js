import DoublyLinkedList from "../structures/DoublyLinkedList.js";

export default class createTimeline { 
  constructor() {
    this.projMap = new Map();
  }
  addEvent(
    project,
    event = {
      type: undefined,
      taskId: undefined,
      description: undefined,
      timestamp: new Date(),
    },
  ) {
    if (this.projMap.has(project)) {
      const tl = this.projMap.get(project);
      tl.pushFront(event);
      this.projMap.set(project, tl);
      return;
    } else {
      const newTl = new DoublyLinkedList();
      newTl.pushFront(event);
      this.projMap.set(project, newTl);
    }
  }
  getEvents(proj, limit) {
    if (this.projMap.has(proj)) {
      const tl = this.projMap.get(proj);
      if (limit) return tl.toArray().slice(0, limit)
      return tl.toArray();
    } else return []
  }
  getPaginatedEvents(proj, page, perPage) {
    if (this.projMap.has(proj)) {
      const tl = this.projMap.get(proj);
      return tl.paginate(page, perPage);
    } else return []
  }
}
