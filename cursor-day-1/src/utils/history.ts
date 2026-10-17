import type { EditorState } from '../types/document'

const MAX_HISTORY = 50

export interface HistoryStack {
  past: EditorState[]
  present: EditorState
  future: EditorState[]
}

export function initHistory(present: EditorState): HistoryStack {
  return { past: [], present, future: [] }
}

export function pushHistory(stack: HistoryStack, next: EditorState): HistoryStack {
  if (next === stack.present) return stack
  const past = [...stack.past, stack.present].slice(-MAX_HISTORY)
  return { past, present: next, future: [] }
}

export function undo(stack: HistoryStack): HistoryStack {
  if (stack.past.length === 0) return stack
  const previous = stack.past[stack.past.length - 1]
  const past = stack.past.slice(0, -1)
  return {
    past,
    present: previous,
    future: [stack.present, ...stack.future],
  }
}

export function redo(stack: HistoryStack): HistoryStack {
  if (stack.future.length === 0) return stack
  const next = stack.future[0]
  const future = stack.future.slice(1)
  return {
    past: [...stack.past, stack.present],
    present: next,
    future,
  }
}

export function cloneState(state: EditorState): EditorState {
  return structuredClone(state)
}
