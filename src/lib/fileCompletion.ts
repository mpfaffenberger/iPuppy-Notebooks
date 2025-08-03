import { CompletionContext } from '@codemirror/autocomplete';
import type { CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

/**
 * Detect if the cursor is inside a string literal that could represent a file path
 * This function looks for common file operation patterns like open(), read(), write(), etc.
 */
function isInFilePathContext(context: CompletionContext): boolean {
  const tree = syntaxTree(context.state);
  const node: any = tree.resolveInner(context.pos, -1);
  
  // Check if we're inside a string node
  let stringNode: any = node;
  while (stringNode && stringNode.type.name !== 'String') {
    stringNode = stringNode.parent;
  }
  
  if (!stringNode) return false;
  
  // Get text around the string to see if it's in a file context
  const doc = context.state.doc;
  const from = Math.max(0, stringNode.from - 20);
  const to = Math.min(doc.length, stringNode.to + 10);
  const surroundingText = doc.sliceString(from, to).toLowerCase();
  
  // Check for common file operation patterns
  const filePatterns = [
    'open(', 'read(', 'write(', 'load(', 'save(', 'file(', 'path',
    'with open(', 'os.path', 'glob.glob(', 'import', 'from'
  ];
  
  // Also check if the string itself looks like a path (starts with ./, ../, ~/, or /)
  const stringContent = doc.sliceString(stringNode.from, stringNode.to);
  const pathPattern = /^["']([.~\/]|[a-zA-Z]:[\\\/])/; // Matches "./", "../", "~/", "/", "C:\"
  const looksLikePath = pathPattern.test(stringContent);
  
  console.log('📁 String content:', stringContent, 'looks like path:', looksLikePath);
  
  const hasFilePattern = filePatterns.some(pattern => surroundingText.includes(pattern));
  console.log('📁 Has file pattern:', hasFilePattern, 'patterns found:', filePatterns.filter(p => surroundingText.includes(p)));
  
  return hasFilePattern || looksLikePath;
}

/**
 * Extract the partial file path from a string literal
 */
function getPartialFilePath(context: CompletionContext): string | null {
  const tree = syntaxTree(context.state);
  const node = tree.resolveInner(context.pos, -1);
  
  // Find the string node containing the cursor
  let stringNode: any = node;
  while (stringNode && stringNode.type.name !== 'String') {
    stringNode = stringNode.parent;
  }
  
  if (!stringNode) return null;
  
  // Get the text of the string node
  const text = context.state.doc.sliceString(stringNode.from, stringNode.to);
  
  // Remove quotes (both single and double)
  const filePath = text.replace(/^["']|["']$/g, '');
  
  // Get the partial path up to the cursor position within the string
  const cursorOffsetInString = context.pos - stringNode.from;
  // Adjust for quotes - we don't count the opening quote
  let adjustedOffset = cursorOffsetInString;
  if (text.startsWith('"') || text.startsWith("'")) {
    adjustedOffset -= 1;
  }
  
  const partialPath = filePath.substring(0, adjustedOffset);
  return partialPath;
}

/**
 * File path completion function for CodeMirror
 */
export async function filePathCompletion(context: CompletionContext, socket: any): Promise<CompletionResult | null> {
  // First check if we're in a context that might be a file path
  if (!isInFilePathContext(context)) {
    return null;
  }
  
  // Get the partial file path
  const partialPath = getPartialFilePath(context);
  if (partialPath === null) return null;
  
  // Don't show completions for empty strings or single characters
  // unless explicitly requested (Ctrl+Space)
  if (!context.explicit && partialPath.length < 2) return null;
  
  // Create a promise that will be resolved when we get the response
  return new Promise<CompletionResult | null>((resolve, reject) => {
    // Generate a unique request ID
    const requestId = `file_completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up a response handler
    const responseHandler = (data: any) => {
      if (data.request_id === requestId) {
        // Remove the event listener
        socket.off('file_completion_response', responseHandler);
        
        // Process the completions
        const completions = data.completions || [];
        
        if (completions.length === 0) {
          resolve(null);
          return;
        }
        
        // Create completion options
        const options = completions.map((completion: string) => ({
          label: completion,
          type: completion.endsWith('/') ? 'folder' : 'file',
          detail: completion.endsWith('/') ? 'directory' : 'file'
        }));
        
        // Find the start position of the completion (beginning of the partial path within the string)
        const tree = syntaxTree(context.state);
        const node = tree.resolveInner(context.pos, -1);
        
        let stringNode: any = node;
        while (stringNode && stringNode.type.name !== 'String') {
          stringNode = stringNode.parent;
        }
        
        if (!stringNode) {
          resolve(null);
          return;
        }
        
        // Calculate the replacement range within the string
        const text = context.state.doc.sliceString(stringNode.from, stringNode.to);
        // Use the text variable to avoid unused variable error
        if (!text) return null;
        
        // Handle home directory expansion for replacement range
        let replacementStart = context.pos;
        console.log('🏠 File completion debug:', { partialPath, contextPos: context.pos });
        
        if (partialPath.startsWith('~/')) {
          // Replace the entire ~/ path
          replacementStart = context.pos - partialPath.length;
          console.log('🏠 Home dir detected, replacement start:', replacementStart);
        } else {
          // Normal case - just replace the filename part
          const fileName = partialPath.split('/').pop() || '';
          replacementStart = context.pos - fileName.length;
          console.log('🏠 Normal path, fileName:', fileName, 'replacement start:', replacementStart);
        }
        
        const from = replacementStart;
        const to = context.pos;
        
        resolve({
          from,
          to,
          options,
          validFor: /^[\w./~_-]*$/
        });
      }
    };
    
    // Set up error handler
    const errorHandler = (data: any) => {
      if (data.message && data.message.includes('File completion error')) {
        socket.off('error', errorHandler);
        // Remove the response handler on error too
        socket.off('file_completion_response', responseHandler);
        reject(new Error(data.message));
      }
    };
    
    // Set up timeout handler
    setTimeout(() => {
      socket.off('file_completion_response', responseHandler);
      socket.off('error', errorHandler);
      resolve(null);
    }, 5000); // 5 second timeout
    
    // Register event listeners
    socket.on('file_completion_response', responseHandler);
    socket.on('error', errorHandler);
    
    // Send the request
    socket.emit('file_completion_request', {
      partial_path: partialPath,
      request_id: requestId
    });
  }).catch((error) => {
    console.error('File completion error:', error);
    return null;
  });
}
