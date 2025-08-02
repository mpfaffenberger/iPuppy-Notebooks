import { Box, Select, MenuItem, Button, Typography } from '@mui/material';
import { PlayArrow, Delete } from '@mui/icons-material';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
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
          sx={{ backgroundColor: '#14b8a6', '&:hover': { backgroundColor: '#0d9488' }, '&:disabled': { backgroundColor: 'action.disabledBackground' } }} 
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
            ? (isEditingMarkdown ? '✓ Preview' : '✏️ Edit')
            : (isExecuting ? '⏳ Running...' : '🚀 Run')
          }
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button 
          size="small" 
          variant="outlined" 
          sx={{ color: '#f97316', borderColor: '#f97316', '&:hover': { backgroundColor: '#f97316', color: 'white' } }} 
          startIcon={<Delete />} 
          onClick={() => onDeleteCell(index)}
        >
          Delete
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
                background: '#1e1e1e', 
                color: '#eaeaea', 
                padding: 16,
                border: 'none',
                outline: 'none',
                fontFamily: 'monospace',
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
                    : '<em style="color: #666;">Click to edit markdown...</em>'
                }}
                style={{
                  color: '#eaeaea',
                  lineHeight: '1.6'
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
            theme={dracula}
            onChange={(val) => onUpdateCell(index, { source: [val] })}
          />
        )}
      </Box>

      {/* Cell output - only show for code cells */}
      {cell.cell_type === 'code' && (
        <Box sx={{ p: 2, backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider', minHeight: '60px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Output:</Typography>
            {isExecuting && (
              <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⏳ Executing...
              </Typography>
            )}
          </Box>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
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
              <Typography color="text.secondary" fontStyle="italic">Waiting for output...</Typography>
            ) : (
              <Typography color="text.secondary" fontStyle="italic">No output yet</Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};