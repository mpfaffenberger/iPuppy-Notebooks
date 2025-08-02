import { Box, Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import { PlayArrow, Delete, Add, Refresh } from '@mui/icons-material';

interface SidebarProps {
  notebooks: string[];
  newNotebookName: string;
  onNewNotebookNameChange: (name: string) => void;
  onCreateNotebook: () => void;
  onOpenNotebook: (name: string) => void;
  onDeleteNotebook: (name: string) => void;
  kernelStatus: 'idle' | 'running' | 'error';
  onResetKernel: () => void;
  onEnsureKernel: () => void;
}

export const Sidebar = ({
  notebooks,
  newNotebookName,
  onNewNotebookNameChange,
  onCreateNotebook,
  onOpenNotebook,
  onDeleteNotebook,
  kernelStatus,
  onResetKernel,
  onEnsureKernel
}: SidebarProps) => {
  return (
    <Box sx={{ width: '400px', flexShrink: 0 }}>
      {/* Notebook list */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>🐶 Notebooks</Typography>
          <Box>
            {notebooks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No notebooks yet 🐕</Typography>
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
                    <IconButton size="small" sx={{ color: '#14b8a6' }} onClick={() => onOpenNotebook(nb)}>
                      <PlayArrow fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#f97316' }} onClick={() => onDeleteNotebook(nb)}>
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
              placeholder="🐶 Notebook name"
              style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #555', background: '#1e1e1e', color: '#eaeaea' }}
            />
            <Button variant="contained" startIcon={<Add />} onClick={onCreateNotebook}>
              🐶 Create
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Global Kernel status */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>🚀 Global Kernel</Typography>
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: 1,
              mb: 2,
              backgroundColor:
                kernelStatus === 'idle'
                  ? 'action.disabledBackground'
                  : kernelStatus === 'running'
                  ? '#0d9488'
                  : '#ea580c',
            }}
          >
            {kernelStatus.charAt(0).toUpperCase() + kernelStatus.slice(1)}
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              sx={{ backgroundColor: '#14b8a6', '&:hover': { backgroundColor: '#0d9488' } }}
              startIcon={<PlayArrow />}
              fullWidth
              onClick={onEnsureKernel}
            >
              🚀 Ensure
            </Button>
            <Button
              variant="contained"
              sx={{ backgroundColor: '#f97316', '&:hover': { backgroundColor: '#ea580c' } }}
              startIcon={<Refresh />}
              fullWidth
              onClick={onResetKernel}
            >
              🔄 Reset
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};