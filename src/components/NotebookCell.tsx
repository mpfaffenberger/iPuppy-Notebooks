import { Box, Select, MenuItem, Button, Typography } from '@mui/material';
import { PlayArrow, Delete } from '@mui/icons-material';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { createTheme } from '@uiw/codemirror-themes';
import { tags } from '@lezer/highlight';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { marked } from 'marked';
import type { NotebookCell as CellType } from './types';

interface NotebookCellProps {
  cell: CellType;
  index: number;
  isExecuting: boolean;
  isEditingMarkdown: boolean;
  onUpdateCell: (index: number, patch: Partial<CellType>) => void;
  onExecuteCell: (index: number) => void;
  onDeleteCell: (index: number) => void;
  onToggleMarkdownEdit: (index: number) => void;
  pythonCompletion: any; // Type from CodeMirror
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

export const NotebookCell = ({
  cell,
  index,
  isExecuting,
  isEditingMarkdown,
  onUpdateCell,
  onExecuteCell,
  onDeleteCell,
  onToggleMarkdownEdit,
  pythonCompletion,
  cleanAnsiCodes
}: NotebookCellProps) => {
  return (
    <Box sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Cell header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Select
          size="small"
          value={cell.cell_type}
          onChange={(e) =>
            onUpdateCell(index, { cell_type: e.target.value as 'code' | 'markdown' })
          }
          sx={{ width: 120 }}
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
            color: '#d4d4d8'
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
        <Box sx={{ flex: 1 }} />
        <Button 
          size="small" 
          variant="contained" 
          sx={{ 
            backgroundColor: '#3f3f46', 
            '&:hover': { backgroundColor: '#52525b' }, 
            color: '#d4d4d8'
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
                minHeight: 120, 
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
            height="200px"
            extensions={[
              python(),
              autocompletion({ override: [pythonCompletion] }),
              keymap.of(completionKeymap)
            ]}
            theme={refinedTheme}
            onChange={(val) => onUpdateCell(index, { source: [val] })}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
            }}
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
        <Box sx={{ p: 2, backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider', minHeight: '60px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">output:</Typography>
            {isExecuting && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                executing...
              </Typography>
            )}
          </Box>
          <Box sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
            {cell.outputs?.length ? (
              Array.isArray(cell.outputs) ? (
                cell.outputs.map((output, i) => (
                  <div key={i}>
                    {typeof output === 'string' 
                      ? cleanAnsiCodes(output)
                      : (output && typeof output === 'object' && 'text' in output 
                          ? cleanAnsiCodes((output as any).text)
                          : JSON.stringify(output, null, 2))
                    }
                  </div>
                ))
              ) : (
                typeof cell.outputs === 'string' 
                  ? cleanAnsiCodes(cell.outputs)
                  : (cell.outputs && typeof cell.outputs === 'object' && 'text' in cell.outputs 
                      ? cleanAnsiCodes((cell.outputs as any).text)
                      : JSON.stringify(cell.outputs, null, 2))
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