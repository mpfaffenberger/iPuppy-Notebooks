import { AppBar, Toolbar, Typography, Box, IconButton, Button } from '@mui/material';
import { Menu, ChevronLeft, BugReport, Save, PlayArrow, Refresh } from '@mui/icons-material';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenDebugModal: () => void;
  currentNotebook: string | null;
  onSaveNotebook: () => void;
  kernelStatus: 'idle' | 'running' | 'error';
  onResetKernel: () => void;
  onEnsureKernel: () => void;
}

export const Header = ({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenDebugModal,
  currentNotebook,
  onSaveNotebook,
  kernelStatus,
  onResetKernel,
  onEnsureKernel
}: HeaderProps) => {
  return (
    <AppBar position="static" color="default">
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            onClick={onToggleSidebar}
            sx={{ mr: 1 }}
          >
            {sidebarCollapsed ? <Menu /> : <ChevronLeft />}
          </IconButton>
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🐶 ipuppy-notebooks 🐶
          </Typography>
          
          {/* Kernel Status */}
          <Box display="flex" alignItems="center" gap={1} sx={{ ml: 3 }}>
            <Typography variant="body2" color="text.secondary">kernel</Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '4px',
                border: '1px solid #3f3f46',
                backgroundColor:
                  kernelStatus === 'idle'
                    ? '#18181b'
                    : kernelStatus === 'running'
                    ? '#27272a'
                    : '#27272a',
                color: kernelStatus === 'running' ? '#d4d4d8' : '#71717a',
                fontSize: '0.75rem'
              }}
            >
              {kernelStatus}
            </Box>
            <Button
              variant="contained"
              size="small"
              sx={{ 
                backgroundColor: '#3f3f46', 
                '&:hover': { backgroundColor: '#52525b' },
                color: '#d4d4d8',
                minWidth: 'auto',
                px: 1
              }}
              startIcon={<PlayArrow fontSize="small" />}
              onClick={onEnsureKernel}
            >
              ensure
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{ 
                backgroundColor: '#3f3f46', 
                '&:hover': { backgroundColor: '#52525b' },
                color: '#d4d4d8',
                minWidth: 'auto',
                px: 1
              }}
              startIcon={<Refresh fontSize="small" />}
              onClick={onResetKernel}
            >
              reset
            </Button>
          </Box>
          
          <IconButton
            color="inherit"
            onClick={onOpenDebugModal}
            sx={{ ml: 2 }}
            title="Debug Info"
          >
            <BugReport />
          </IconButton>
        </Box>
        {currentNotebook && (
          <Box display="flex" alignItems="center" gap={2}>
            <Typography color="text.secondary">{currentNotebook}</Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<Save />} 
              onClick={onSaveNotebook}
              sx={{ 
                borderColor: '#3f3f46',
                color: '#a1a1aa',
                '&:hover': { 
                  borderColor: '#52525b',
                  backgroundColor: '#27272a',
                  color: '#d4d4d8'
                }
              }}
            >
              save
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};