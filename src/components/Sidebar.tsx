import { Box, Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import { PlayArrow, Delete, Add } from '@mui/icons-material';

interface SidebarProps {
  notebooks: string[];
  newNotebookName: string;
  onNewNotebookNameChange: (name: string) => void;
  onCreateNotebook: () => void;
  onOpenNotebook: (name: string) => void;
  onDeleteNotebook: (name: string) => void;
}

export const Sidebar = ({
  notebooks,
  newNotebookName,
  onNewNotebookNameChange,
  onCreateNotebook,
  onOpenNotebook,
  onDeleteNotebook
}: SidebarProps) => {
  return (
    <Box sx={{ width: '400px', flexShrink: 0 }}>
      {/* Notebook list */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>notebooks</Typography>
          <Box>
            {notebooks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">no notebooks yet</Typography>
            ) : (
              notebooks.map((nb) => (
                <Box
                  key={nb}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onOpenNotebook(nb)}
                  >
                    {nb}
                  </Typography>
                  <Box>
                    <IconButton size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#d4d4d8' } }} onClick={() => onOpenNotebook(nb)}>
                      <PlayArrow fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#71717a', '&:hover': { color: '#a1a1aa' } }} onClick={() => onDeleteNotebook(nb)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))
            )}
          </Box>
          {/* Create notebook */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <input
              value={newNotebookName}
              onChange={(e) => onNewNotebookNameChange(e.target.value)}
              placeholder="notebook name"
              style={{ 
                flex: 1, 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #3f3f46', 
                background: '#18181b', 
                color: '#d4d4d8',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.875rem'
              }}
            />
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={onCreateNotebook} 
              sx={{ 
                backgroundColor: '#3f3f46', 
                '&:hover': { backgroundColor: '#52525b' },
                color: '#d4d4d8'
              }}
            >
              create
            </Button>
          </Box>
        </CardContent>
      </Card>

    </Box>
  );
};