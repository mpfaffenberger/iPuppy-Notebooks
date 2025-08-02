import { 
  Modal, 
  Box, 
  Typography, 
  Button, 
  Chip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';

interface DebugModalProps {
  open: boolean;
  onClose: () => void;
  websocketStatus: string;
  kernelId: string | null;
  allKernels: any[];
  onRefreshKernels: () => void;
}

export const DebugModal = ({
  open,
  onClose,
  websocketStatus,
  kernelId,
  allKernels,
  onRefreshKernels
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
        
        {/* WebSocket Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>WebSocket Status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={websocketStatus}
              color={websocketStatus === 'Connected' ? 'success' : 'error'}
              variant="outlined"
            />
            {kernelId && (
              <Typography variant="body2">
                Connected to kernel: {kernelId}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Kernels Table */}
        <Box>
          <Typography variant="h6" gutterBottom>Active Kernels</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kernel ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Current</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allKernels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="text.secondary">No kernels running</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  allKernels.map((kernel) => (
                    <TableRow key={kernel.id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {kernel.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={kernel.running ? 'Running' : 'Stopped'} 
                          color={kernel.running ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {kernel.id === kernelId ? (
                          <Chip label="Current" color="primary" size="small" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onRefreshKernels} variant="outlined">
            🔄 Refresh
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};