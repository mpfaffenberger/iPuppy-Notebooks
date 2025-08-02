import { 
  Modal, 
  Box, 
  Typography, 
  Button, 
  Chip
} from '@mui/material';

interface DebugModalProps {
  open: boolean;
  onClose: () => void;
  websocketStatus: string;
  kernelStatus: 'idle' | 'running' | 'error';
  onRefreshStatus: () => void;
}

export const DebugModal = ({
  open,
  onClose,
  websocketStatus,
  kernelStatus,
  onRefreshStatus
}: DebugModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="debug-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 24,
        p: 4,
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <Typography id="debug-modal-title" variant="h6" component="h2" gutterBottom>
          🐛 Debug Information
        </Typography>
        
        {/* Socket.IO Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Socket.IO Status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={websocketStatus}
              color={websocketStatus === 'Connected' ? 'success' : 'error'}
              variant="outlined"
            />
            <Typography variant="body2">
              Connected to Global Kernel
            </Typography>
          </Box>
        </Box>

        {/* Global Kernel Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Global Kernel Status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={kernelStatus.charAt(0).toUpperCase() + kernelStatus.slice(1)}
              color={kernelStatus === 'running' ? 'success' : kernelStatus === 'error' ? 'error' : 'default'}
              variant="outlined"
            />
            <Typography variant="body2" fontFamily="monospace">
              global-kernel
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onRefreshStatus} variant="outlined">
            🔄 Refresh Status
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};