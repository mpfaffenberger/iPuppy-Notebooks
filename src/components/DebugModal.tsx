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
          debug information
        </Typography>
        
        {/* Socket.IO Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>socket.io status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={websocketStatus}
              sx={{ 
                borderColor: '#3f3f46',
                color: websocketStatus === 'Connected' ? '#d4d4d8' : '#71717a',
                backgroundColor: websocketStatus === 'Connected' ? '#27272a' : '#18181b'
              }}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              global kernel connection
            </Typography>
          </Box>
        </Box>

        {/* Global Kernel Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>kernel status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={kernelStatus.charAt(0).toUpperCase() + kernelStatus.slice(1)}
              sx={{ 
                borderColor: '#3f3f46',
                color: kernelStatus === 'running' ? '#d4d4d8' : '#71717a',
                backgroundColor: kernelStatus === 'running' ? '#27272a' : '#18181b'
              }}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              global-kernel
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            onClick={onRefreshStatus} 
            variant="outlined"
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
            refresh status
          </Button>
          <Button 
            onClick={onClose} 
            variant="contained"
            sx={{
              backgroundColor: '#71717a',
              '&:hover': { backgroundColor: '#52525b' },
              color: '#d4d4d8'
            }}
          >
            close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};