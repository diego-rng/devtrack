import DoublyLinkedList from '../structures/DoublyLinkedList';

export const projMap = new Map();
const timeline = new DoublyLinkedList();

export function addToTimeline(
  project,
  event = {
    type: undefined,
    taskId: undefined,
    description: undefined,
    timestamp: new Date(),
  },
) {
  if (projMap.has(project)) {
    const tl = projMap.get(project);
    tl.pushFront(event);
    projMap.set(project, tl);
    return;
  } else {
    const newTl = DoublyLinkedList();
    newTl.pushFront(event);
    projMap.set(project, newTl);
  }
}
