import React from 'react';
import { Box, Select, MenuItem, Button, Typography } from '@mui/material';
import { PlayArrow, Delete, KeyboardArrowUp, KeyboardArrowDown, UnfoldMore, UnfoldLess } from '@mui/icons-material';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { createTheme } from '@uiw/codemirror-themes';
import { tags } from '@lezer/highlight';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { filePathCompletion } from '../lib/fileCompletion';
import { customTabHandler } from '../lib/tabHandler';
import { marked } from 'marked';
import type { NotebookCell as CellType, NotebookCellOutput } from './types';

interface NotebookCellProps {
  cell: CellType;
  index: number;
  isExecuting: boolean;
  isEditingMarkdown: boolean;
  onUpdateCell: (index: number, patch: Partial<CellType>) => void;
  onExecuteCell: (index: number) => void;
  onDeleteCell: (index: number) => void;
  onToggleMarkdownEdit: (index: number) => void;
  onMoveCellUp: (index: number) => void;
  onMoveCellDown: (index: number) => void;
  onFocusNextCell: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pythonCompletion: any; // Type from CodeMirror
  socket: any; // Socket.IO instance
  cleanAnsiCodes: (text: string) => string;
}

// Custom refined theme with subtle colors and thin font
const refinedTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#18181b',
    foreground: '#d4d4d8',
    caret: '#d4d4d8',
    selection: '#27272a',
    selectionMatch: '#3f3f46',
    lineHighlight: '#27272a',
    gutterBackground: '#18181b',
    gutterForeground: '#71717a',
    gutterBorder: '#3f3f46',
    fontFamily: '"JetBrains Mono", monospace',
  },
  styles: [
    { tag: tags.comment, color: '#71717a', fontStyle: 'italic' },
    { tag: tags.string, color: '#7dd3fc', fontWeight: '300' }, // soft blue
    { tag: tags.number, color: '#fbbf24', fontWeight: '300' }, // soft amber
    { tag: tags.keyword, color: '#c084fc', fontWeight: '400' }, // soft purple
    { tag: tags.operator, color: '#a1a1aa', fontWeight: '300' },
    { tag: tags.punctuation, color: '#a1a1aa', fontWeight: '300' },
    { tag: tags.variableName, color: '#d4d4d8', fontWeight: '300' },
    { tag: tags.function(tags.variableName), color: '#34d399', fontWeight: '300' }, // soft green
    { tag: tags.className, color: '#f472b6', fontWeight: '300' }, // soft pink
    { tag: tags.propertyName, color: '#60a5fa', fontWeight: '300' }, // soft blue
  ],
});

const OutputRenderer = ({ output, cleanAnsiCodes }: { output: NotebookCellOutput; cleanAnsiCodes: (text: string) => string }) => {
  // Handle string outputs directly
  if (typeof output === 'string') {
    return <div>{cleanAnsiCodes(output)}</div>;
  }

  // Handle display_data with HTML content
  if (output.output_type === 'display_data' && output.data && 'text/html' in output.data) {
    // For HTML content, render using dangerouslySetInnerHTML
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: output.data['text/html'] }}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.875rem',
          overflow: 'auto'
        }}
      />
    );
  }

  // Handle execute_result with HTML content
  if (output.output_type === 'execute_result' && output.data && 'text/html' in output.data) {
    // For HTML content, render using dangerouslySetInnerHTML
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: output.data['text/html'] }}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.875rem',
          overflow: 'auto'
        }}
      />
    );
  }

  // Handle other object outputs with text property
  if (output && typeof output === 'object' && 'text' in output && (output as any).text) {
    return <div>{cleanAnsiCodes((output as any).text)}</div>;
  }

  // Fallback to JSON.stringify for other object types
  return <div>{JSON.stringify(output, null, 2)}</div>;
};

export const NotebookCell = ({
  cell,
  index,
  isExecuting,
  isEditingMarkdown,
  onUpdateCell,
  onExecuteCell,
  onDeleteCell,
  onToggleMarkdownEdit,
  onMoveCellUp,
  onMoveCellDown,
  onFocusNextCell,
  canMoveUp,
  canMoveDown,
  pythonCompletion,
  socket,
  cleanAnsiCodes
}: NotebookCellProps) => {
  
  const [isContentExpanded, setIsContentExpanded] = React.useState(true);
  const [isOutputExpanded, setIsOutputExpanded] = React.useState(true);
  
  // Store reference to CodeMirror view for tab handling
  const codeMirrorViewRef = React.useRef<any>(null);
  

  // Intercept Tab before CodeMirror can preventDefault it
  React.useEffect(() => {
    const tabInterceptor = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement;
        // Only intercept if we're in a CodeMirror content area
        if (target && target.closest('.cm-content')) {
          event.stopPropagation();
          event.preventDefault();
          
          // Check if this tab is for our cell and use stored view reference
          const cellElement = target.closest('[data-cell-index]');
          if (cellElement) {
            const cellIndex = parseInt(cellElement.getAttribute('data-cell-index') || '0');
            
            // Only handle if this is our cell
            if (cellIndex === index && codeMirrorViewRef.current) {
              const view = codeMirrorViewRef.current;
              
              // Call our custom tab handler directly
              import('../lib/tabHandler').then(({ customTabHandler }) => {
                const handler = customTabHandler();
                handler.run!(view);
              });
            }
          }
        }
      }
    };
    
    // Use capture phase to get Tab before CodeMirror
    document.addEventListener('keydown', tabInterceptor, true);
    
    return () => {
      document.removeEventListener('keydown', tabInterceptor, true);
    };
  }, []);
  
  // Use useEffect to add global event listener for this cell
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if this cell is focused
      const activeElement = document.activeElement;
      const cellElement = document.querySelector(`[data-cell-index="${index}"]`);
      
      if (cellElement && cellElement.contains(activeElement)) {
        if (event.shiftKey && event.key === 'Enter') {
          console.log('Global handler: Shift+Enter detected for cell', index);
          event.preventDefault();
          event.stopPropagation();
          
          if (cell.cell_type === 'code') {
            console.log('Global handler: Executing code cell', index);
            onExecuteCell(index);
            setTimeout(() => {
              console.log('Global handler: Focusing next cell after', index);
              onFocusNextCell(index);
            }, 100);
          } else if (cell.cell_type === 'markdown' && isEditingMarkdown) {
            console.log('Global handler: Switching markdown to preview', index);
            onToggleMarkdownEdit(index);
            setTimeout(() => {
              console.log('Global handler: Focusing next cell after markdown', index);
              onFocusNextCell(index);
            }, 100);
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [index, cell.cell_type, isEditingMarkdown, onExecuteCell, onToggleMarkdownEdit, onFocusNextCell]);
  return (
    <Box 
      data-cell-index={index}
      sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      {/* Cell header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Select
          size="small"
          value={cell.cell_type}
          onChange={(e) =>
            onUpdateCell(index, { cell_type: e.target.value as 'code' | 'markdown' })
          }
          sx={{ 
            width: 120,
            height: '28px',
            fontSize: '0.75rem',
            '& .MuiSelect-select': {
              py: 0.25,
              minHeight: 'unset'
            }
          }}
        >
          <MenuItem value="code">Code</MenuItem>
          <MenuItem value="markdown">Markdown</MenuItem>
        </Select>
        <Button 
          size="small" 
          variant="contained" 
          disabled={cell.cell_type === 'code' && isExecuting}
          sx={{ 
            backgroundColor: '#3f3f46', 
            '&:hover': { backgroundColor: '#52525b' }, 
            '&:disabled': { backgroundColor: '#27272a', color: '#71717a' },
            color: '#d4d4d8',
            fontSize: '0.75rem',
            py: 0.25,
            px: 1
          }} 
          startIcon={<PlayArrow />} 
          onClick={() => {
            if (cell.cell_type === 'markdown') {
              onToggleMarkdownEdit(index);
            } else {
              onExecuteCell(index);
            }
          }}
        >
          {cell.cell_type === 'markdown' 
            ? (isEditingMarkdown ? 'preview' : 'edit')
            : (isExecuting ? 'running...' : '🚀 run')
          }
        </Button>
        
        {/* Content expand toggle - only for code cells */}
        {cell.cell_type === 'code' && (
          <Button
            size="small"
            variant="contained"
            sx={{
              backgroundColor: '#3f3f46',
              '&:hover': { backgroundColor: '#52525b' },
              color: '#d4d4d8',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              fontSize: '0.75rem'
            }}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            title={isContentExpanded ? "Collapse content" : "Expand content"}
          >
            {isContentExpanded ? <UnfoldLess fontSize="small" /> : <UnfoldMore fontSize="small" />}
          </Button>
        )}
        
        <Box sx={{ flex: 1 }} />
        
        {/* Move buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            disabled={!canMoveUp}
            sx={{
              backgroundColor: '#3f3f46',
              '&:hover': { backgroundColor: '#52525b' },
              '&:disabled': { backgroundColor: '#27272a', color: '#71717a' },
              color: '#d4d4d8',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              fontSize: '0.75rem'
            }}
            onClick={() => onMoveCellUp(index)}
          >
            <KeyboardArrowUp fontSize="small" />
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!canMoveDown}
            sx={{
              backgroundColor: '#3f3f46',
              '&:hover': { backgroundColor: '#52525b' },
              '&:disabled': { backgroundColor: '#27272a', color: '#71717a' },
              color: '#d4d4d8',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              fontSize: '0.75rem'
            }}
            onClick={() => onMoveCellDown(index)}
          >
            <KeyboardArrowDown fontSize="small" />
          </Button>
        </Box>
        
        <Button 
          size="small" 
          variant="contained" 
          sx={{ 
            backgroundColor: '#3f3f46', 
            '&:hover': { backgroundColor: '#52525b' }, 
            color: '#d4d4d8',
            fontSize: '0.75rem',
            py: 0.25,
            px: 1
          }} 
          startIcon={<Delete />} 
          onClick={() => onDeleteCell(index)}
        >
          delete
        </Button>
      </Box>

      {/* Cell content */}
      <Box sx={{ p: 0 }}>
        {cell.cell_type === 'markdown' ? (
          isEditingMarkdown ? (
            <textarea
              style={{ 
                width: '100%', 
                height: 'auto',
                minHeight: '120px',
                background: '#18181b', 
                color: '#d4d4d8', 
                padding: 16,
                border: 'none',
                outline: 'none',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '14px',
                resize: 'vertical'
              }}
              value={cell.source.join('')}
              onChange={(e) => onUpdateCell(index, { source: [e.target.value] })}
              onBlur={() => onToggleMarkdownEdit(index)}
              autoFocus
            />
          ) : (
            <Box 
              sx={{ 
                p: 2, 
                minHeight: 120,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={() => onToggleMarkdownEdit(index)}
            >
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: cell.source.join('').trim() 
                    ? marked(cell.source.join('')) 
                    : '<em style="color: #71717a;">Click to edit markdown...</em>'
                }}
                style={{
                  color: '#d4d4d8',
                  lineHeight: '1.6',
                  fontFamily: '"JetBrains Mono", monospace'
                }}
              />
            </Box>
          )
        ) : (
          <CodeMirror
            value={cell.source.join('')}
            height={isContentExpanded ? "auto" : "200px"}
            extensions={[
              python(),
              autocompletion({ override: [pythonCompletion, (context) => {
                // Use socket from props scope, but add a check to prevent errors
                if (!socket) {
                  console.warn('Socket not available for file completion');
                  return null;
                }
                return filePathCompletion(context, socket);
              }] }),
              // Test keymap to verify keymaps work
              testKeymap,
              // ONLY our custom tab handler - no other keymaps for now
              keymap.of([customTabHandler()])
            ]}
            theme={refinedTheme}
            onChange={(val) => onUpdateCell(index, { source: [val] })}
            onCreateEditor={(view) => {
              codeMirrorViewRef.current = view;
            }}
            basicSetup={false}
            style={{
              fontSize: '14px',
              fontWeight: '300',
              fontFamily: '"JetBrains Mono", monospace'
            }}
          />
        )}
      </Box>

      {/* Cell output - only show for code cells */}
      {cell.cell_type === 'code' && (
        <Box sx={{ backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">output:</Typography>
              {isExecuting && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  executing...
                </Typography>
              )}
            </Box>
            
            {/* Output expand toggle */}
            <Button
              size="small"
              variant="contained"
              sx={{
                backgroundColor: '#3f3f46',
                '&:hover': { backgroundColor: '#52525b' },
                color: '#d4d4d8',
                minWidth: 'auto',
                px: 1,
                py: 0.25,
                fontSize: '0.75rem'
              }}
              onClick={() => setIsOutputExpanded(!isOutputExpanded)}
              title={isOutputExpanded ? "Collapse output" : "Expand output"}
            >
              {isOutputExpanded ? <UnfoldLess fontSize="small" /> : <UnfoldMore fontSize="small" />}
            </Button>
          </Box>
          <Box sx={{ 
            fontFamily: '"JetBrains Mono", monospace', 
            fontSize: '0.875rem', 
            whiteSpace: 'pre-wrap',
            p: 2,
            pt: 0,
            maxHeight: isOutputExpanded ? 'none' : '200px',
            overflow: isOutputExpanded ? 'visible' : 'auto',
            minHeight: '60px'
          }}>
            {cell.outputs?.length ? (
              Array.isArray(cell.outputs) ? (
                cell.outputs.map((output, i) => (
                  <OutputRenderer key={i} output={output} cleanAnsiCodes={cleanAnsiCodes} />
                ))
              ) : (
                <OutputRenderer output={cell.outputs} cleanAnsiCodes={cleanAnsiCodes} />
              )
            ) : isExecuting ? (
              <Typography color="text.secondary" fontStyle="italic">waiting for output...</Typography>
            ) : (
              <Typography color="text.secondary" fontStyle="italic">no output yet</Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};