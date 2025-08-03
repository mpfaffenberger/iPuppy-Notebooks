import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { NotebookCell } from './NotebookCell';
import type { NotebookCell as CellType } from './types';

interface NotebookContainerProps {
  currentNotebook: string | null;
  notebookContent: CellType[];
  executingCells: Set<number>;
  editingMarkdownCells: Set<number>;
  onUpdateCell: (index: number, patch: Partial<CellType>) => void;
  onExecuteCell: (index: number) => void;
  onDeleteCell: (index: number) => void;
  onAddCell: () => void;
  onToggleMarkdownEdit: (index: number) => void;
  onMoveCellUp: (index: number) => void;
  onMoveCellDown: (index: number) => void;
  onFocusNextCell: (index: number) => void;
  pythonCompletion: any;
  socket: any;
  cleanAnsiCodes: (text: string) => string;
}

export const NotebookContainer = ({
  currentNotebook,
  notebookContent,
  executingCells,
  editingMarkdownCells,
  onUpdateCell,
  onExecuteCell,
  onDeleteCell,
  onAddCell,
  onToggleMarkdownEdit,
  onMoveCellUp,
  onMoveCellDown,
  onFocusNextCell,
  pythonCompletion,
  socket,
  cleanAnsiCodes
}: NotebookContainerProps) => {
  if (!currentNotebook) {
    return (
      <Box textAlign="center" mt={8} color="text.secondary">
        <Typography variant="h4" gutterBottom>🐶 welcome to ipuppy notebooks 🐶</Typography>
        <Typography gutterBottom>select a notebook or create a new one to begin</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {notebookContent.map((cell, idx) => (
        <NotebookCell
          key={idx}
          cell={cell}
          index={idx}
          isExecuting={executingCells.has(idx)}
          isEditingMarkdown={editingMarkdownCells.has(idx)}
          onUpdateCell={onUpdateCell}
          onExecuteCell={onExecuteCell}
          onDeleteCell={onDeleteCell}
          onToggleMarkdownEdit={onToggleMarkdownEdit}
          onMoveCellUp={onMoveCellUp}
          onMoveCellDown={onMoveCellDown}
          onFocusNextCell={onFocusNextCell}
          canMoveUp={idx > 0}
          canMoveDown={idx < notebookContent.length - 1}
          pythonCompletion={pythonCompletion}
          socket={socket}
          cleanAnsiCodes={cleanAnsiCodes}
        />
      ))}
      <Box mt={2}>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={onAddCell}
          sx={{ 
            backgroundColor: '#3f3f46', 
            '&:hover': { backgroundColor: '#52525b' },
            color: '#d4d4d8'
          }}
        >
          add cell
        </Button>
      </Box>
    </Box>
  );
};