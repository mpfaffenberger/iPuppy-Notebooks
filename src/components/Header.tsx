import { AppBar, Toolbar, Typography, Box, IconButton, Button } from '@mui/material';
import { Menu, ChevronLeft, BugReport, Save } from '@mui/icons-material';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenDebugModal: () => void;
  currentNotebook: string | null;
  onSaveNotebook: () => void;
}

export const Header = ({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenDebugModal,
  currentNotebook,
  onSaveNotebook
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
            <i className="fas fa-paw" /> 🐶🐕🦮 iPuppy Notebooks 🐕‍🦺🐩🐕
          </Typography>
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
            <Typography>🐶 {currentNotebook} 🐕</Typography>
            <Button variant="contained" size="small" startIcon={<Save />} onClick={onSaveNotebook}>
              🐕 Save 🐶
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};