import type { KeyBinding } from '@codemirror/view';
import { indentMore } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { startCompletion } from '@codemirror/autocomplete';

/**
 * Check if cursor is inside a string literal
 */
function isInsideString(state: any, pos: number): boolean {
  const tree = syntaxTree(state);
  const node = tree.resolveInner(pos, -1);
  
  let currentNode: any = node;
  while (currentNode) {
    if (currentNode.type.name === 'String') {
      return true;
    }
    currentNode = currentNode.parent;
  }
  
  return false;
}

/**
 * Check if cursor is after a dot (for object member completion)
 */
function isAfterDot(state: any, pos: number): boolean {
  const doc = state.doc;
  
  // Look at the character before the cursor
  if (pos > 0) {
    const charBefore = doc.sliceString(pos - 1, pos);
    return charBefore === '.';
  }
  
  return false;
}

/**
 * Custom tab handler that provides context-sensitive behavior
 */
export function customTabHandler(): KeyBinding {
  return {
    key: 'Tab',
    run: (view) => {
      const state = view.state;
      const pos = state.selection.main.head;
      
      // If inside a string, trigger autocompletion
      if (isInsideString(state, pos)) {
        return startCompletion(view);
      }
      
      // If after a dot, trigger autocompletion
      if (isAfterDot(state, pos)) {
        return startCompletion(view);
      }
      
      // Otherwise, perform indentation
      return indentMore(view);
    }
  };
}
