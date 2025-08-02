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
  pythonCompletion: any;
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
  pythonCompletion,
  cleanAnsiCodes
}: NotebookContainerProps) => {
  if (!currentNotebook) {
    return (
      <Box textAlign="center" mt={8} color="text.secondary">
        <Typography variant="h4" gutterBottom>🐶 Welcome to iPuppy Notebooks! 🚀</Typography>
        <Typography gutterBottom>Select a notebook or create a new one to begin your coding adventure! 🐕‍🦺</Typography>
        <i className="fas fa-paw fa-3x" style={{ color: '#8a2be2' }} />
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
          pythonCompletion={pythonCompletion}
          cleanAnsiCodes={cleanAnsiCodes}
        />
      ))}
      <Box mt={2}>
        <Button variant="contained" startIcon={<Add />} onClick={onAddCell}>
          🐶 Add Cell
        </Button>
      </Box>
    </Box>
  );
};