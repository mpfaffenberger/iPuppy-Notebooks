import type { KeyBinding } from '@codemirror/view';
import { indentMore } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { startCompletion, completionStatus, moveCompletionSelection } from '@codemirror/autocomplete';

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
 * Also handles cases where there might be partial text after the dot
 */
function isAfterDot(state: any, pos: number): boolean {
  const doc = state.doc;
  
  // Look backwards to find a dot that could be for member access
  let searchPos = pos - 1;
  
  // Skip over any identifier characters (letters, digits, underscore)
  while (searchPos >= 0) {
    const char = doc.sliceString(searchPos, searchPos + 1);
    if (/[a-zA-Z0-9_]/.test(char)) {
      searchPos--;
      continue;
    } else if (char === '.') {
      // Found a dot! Check that it's preceded by a valid identifier
      if (searchPos > 0) {
        const beforeDot = doc.sliceString(searchPos - 1, searchPos);
        // The dot should be preceded by an identifier character or closing bracket/paren
        return /[a-zA-Z0-9_)\]]/.test(beforeDot);
      }
      return false;
    } else {
      // Hit a non-identifier, non-dot character
      break;
    }
  }
  
  return false;
}

/**
 * Check if cursor is in a position where Python completions would be helpful
 * (e.g., at start of identifier, after keywords, etc.)
 */
function shouldTriggerPythonCompletion(state: any, pos: number): boolean {
  const doc = state.doc;
  
  // Check if we're in the middle of typing an identifier
  const currentLine = doc.lineAt(pos);
  const lineText = currentLine.text;
  const posInLine = pos - currentLine.from;
  
  // Get text before cursor on current line
  const beforeCursor = lineText.slice(0, posInLine);
  
  // If there's an identifier character right before the cursor, we might want completion
  if (posInLine > 0 && /[a-zA-Z0-9_]/.test(beforeCursor[beforeCursor.length - 1])) {
    // Make sure we're not in a string
    return !isInsideString(state, pos);
  }
  
  // If we're after certain keywords or operators, trigger completion
  const keywordPattern = /\b(import|from|class|def|if|elif|else|for|while|with|as|return|yield|except|raise|assert|global|nonlocal)\s+$/;
  if (keywordPattern.test(beforeCursor)) {
    return true;
  }
  
  return false;
}

/**
 * Custom tab handler that provides context-sensitive behavior
 */
export function customTabHandler(): KeyBinding {
  return {
    key: 'Tab',
    preventDefault: false,
    run: (view) => {
      const state = view.state;
      const pos = state.selection.main.head;
      
      // Check if completion popup is open
      const status = completionStatus(state);
      if (status === 'active') {
        // If completion is active, move to next completion
        return moveCompletionSelection(true)(view);
      }
      
      // If inside a string, trigger file path autocompletion
      if (isInsideString(state, pos)) {
        return startCompletion(view);
      }
      
      // If after a dot, trigger Python object member completion
      if (isAfterDot(state, pos)) {
        return startCompletion(view);
      }
      
      // If in a context where Python completion would be helpful, trigger it
      if (shouldTriggerPythonCompletion(state, pos)) {
        return startCompletion(view);
      }
      
      // Otherwise, perform indentation
      return indentMore(view);
    }
  };
}
