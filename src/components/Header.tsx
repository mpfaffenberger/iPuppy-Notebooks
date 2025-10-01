import { AppBar, Toolbar, Typography, Box, IconButton, Button, Select, MenuItem, FormControl } from '@mui/material';
import { Menu, ChevronLeft, BugReport, Save, PlayArrow, Refresh, SmartToy } from '@mui/icons-material';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenDebugModal: () => void;
  currentNotebook: string | null;
  onSaveNotebook: () => void;
  kernelStatus: 'idle' | 'running' | 'error';
  onResetKernel: () => void;
  onEnsureKernel: () => void;
  availableModels: {[key: string]: string};
  currentModel: string;
  onModelChange: (modelKey: string) => void;
  isAutoSaving?: boolean;
}

export const Header = ({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenDebugModal,
  currentNotebook,
  onSaveNotebook,
  kernelStatus,
  onResetKernel,
  onEnsureKernel,
  availableModels,
  currentModel,
  onModelChange,
  isAutoSaving = false
}: HeaderProps) => {
  return (
    <AppBar 
      position="sticky" 
      color="default"
      sx={{ 
        top: 0,
        zIndex: 1100,
        borderBottom: '1px solid #3f3f46'
      }}
    >
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

          {/* Model Selector */}
          <Box display="flex" alignItems="center" gap={1} sx={{ ml: 3 }}>
            <SmartToy sx={{ color: '#71717a', fontSize: '1rem' }} />
            <Typography variant="body2" color="text.secondary">model</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={currentModel}
                onChange={(e) => onModelChange(e.target.value)}
                sx={{
                  color: '#d4d4d8',
                  fontSize: '0.75rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3f3f46',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#52525b',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#71717a',
                  },
                  '& .MuiSelect-icon': {
                    color: '#71717a',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#27272a',
                      border: '1px solid #3f3f46',
                      '& .MuiMenuItem-root': {
                        color: '#d4d4d8',
                        fontSize: '0.75rem',
                        '&:hover': {
                          backgroundColor: '#3f3f46',
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#52525b',
                          '&:hover': {
                            backgroundColor: '#52525b',
                          },
                        },
                      },
                    },
                  },
                }}
              >
                {Object.entries(availableModels).map(([key, name]) => (
                  <MenuItem key={key} value={key}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                },
                // Animation for auto-saving flash
                animation: isAutoSaving ? 'saveButtonFlash 1s ease-in-out' : 'none',
                '@keyframes saveButtonFlash': {
                  '0%': {
                    borderColor: '#3f3f46',
                    backgroundColor: '#27272a',
                    color: '#a1a1aa',
                  },
                  '50%': {
                    borderColor: '#4ade80',  // green-500
                    backgroundColor: '#4ade8020',  // green with opacity
                    color: '#4ade80',  // green-500
                  },
                  '100%': {
                    borderColor: '#3f3f46',
                    backgroundColor: '#27272a',
                    color: '#a1a1aa',
                  },
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