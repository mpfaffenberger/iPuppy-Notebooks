import { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Snackbar } from '@mui/material';
import { CompletionContext } from '@codemirror/autocomplete';
import { io, Socket } from 'socket.io-client';
import { 
  Header, 
  Sidebar, 
  NotebookContainer, 
  DebugModal
} from './components';
import type { NotebookCellType, KernelStatus } from './components';
import './index.css';

const darkTheme = createTheme({ 
  palette: { 
    mode: 'dark',
    primary: {
      main: '#a1a1aa',      // zinc-400
      dark: '#71717a',      // zinc-500  
      light: '#d4d4d8'      // zinc-300
    },
    secondary: {
      main: '#71717a',      // zinc-500
      dark: '#52525b',      // zinc-600
      light: '#a1a1aa'      // zinc-400
    },
    background: {
      default: '#18181b',   // zinc-900
      paper: '#27272a'      // zinc-800
    },
    text: {
      primary: '#d4d4d8',   // zinc-300 - subtle light grey
      secondary: '#a1a1aa'  // zinc-400 - more muted
    },
    divider: '#3f3f46',     // zinc-700
    success: {
      main: '#71717a',      // neutral grey instead of teal
      dark: '#52525b',
      light: '#a1a1aa'
    },
    error: {
      main: '#71717a',      // neutral grey instead of orange
      dark: '#52525b', 
      light: '#a1a1aa'
    },
    warning: {
      main: '#71717a',
      dark: '#52525b',
      light: '#a1a1aa'
    },
    info: {
      main: '#71717a',
      dark: '#52525b',
      light: '#a1a1aa'
    }
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
    h1: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    h2: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    h3: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    h4: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    h5: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    h6: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 },
    body1: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 300 },
    body2: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 300 },
    button: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400, textTransform: 'none' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          },
          '&:active': {
            boxShadow: 'none'
          },
          '&:focus': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          border: '1px solid #3f3f46'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace'
        }
      }
    }
  }
});

function App() {
  // State
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [notebookContent, setNotebookContent] = useState<NotebookCellType[]>([]);
  const [kernelStatus, setKernelStatus] = useState<KernelStatus>('idle');
  const [newNotebookName, setNewNotebookName] = useState<string>('');
  const [alert, setAlert] = useState<
    | { message: string; severity: 'success' | 'error' | 'warning' | 'info' }
    | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [executingCells, setExecutingCells] = useState<Set<number>>(new Set());
  const [editingMarkdownCells, setEditingMarkdownCells] = useState<Set<number>>(new Set());
  const [debugModalOpen, setDebugModalOpen] = useState<boolean>(false);
  const [autoSaveEnabled] = useState<boolean>(false);
  
  // Use ref to avoid stale closure issues
  const socketRef = useRef<Socket | null>(null);

  // Effects
  useEffect(() => {
    loadNotebooks();
    checkKernelStatus();
    connectSocket();
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection on unmount');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency - only run on mount/unmount

  // Check global kernel status
  const checkKernelStatus = async () => {
    try {
      const res = await fetch('/api/v1/kernel/status');
      if (res.ok) {
        const data = await res.json();
        setKernelStatus(data.status === 'running' ? 'running' : 'idle');
        console.log('Global kernel status:', data.status);
      }
    } catch (error) {
      console.error('Failed to check kernel status:', error);
      setKernelStatus('error');
    }
  };

  const connectSocket = () => {
    // Don't create a new connection if one already exists
    if (socketRef.current && socketRef.current.connected) {
      console.log('Socket already connected, skipping connection attempt');
      return;
    }
    
    console.log('Creating new Socket.IO connection...');
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      upgrade: true
    });
    
    // Store in ref immediately
    socketRef.current = socketInstance;
    
    socketInstance.on('connect', () => {
      console.log('Socket.IO connected to global kernel');
      setSocket(socketInstance);
      setKernelStatus('running');
      showAlert('Connected to global kernel', 'info');
    });
    
    socketInstance.on('connected', (data) => {
      console.log('Socket.IO connection confirmed:', data);
    });
    
    socketInstance.on('execution_result', (data) => {
      console.log('Socket.IO execution result received:', data);
      handleSocketMessage(data);
    });
    
    socketInstance.on('add_cell', (data) => {
      console.log('Socket.IO add_cell received:', data);
      handleAddCellMessage(data);
    });
    
    socketInstance.on('delete_cell', (data) => {
      console.log('Socket.IO delete_cell received:', data);
      handleDeleteCellMessage(data);
    });
    
    socketInstance.on('alter_cell_content', (data) => {
      console.log('Socket.IO alter_cell_content received:', data);
      handleAlterCellContentMessage(data);
    });
    
    socketInstance.on('swap_cell_type', (data) => {
      console.log('Socket.IO swap_cell_type received:', data);
      handleSwapCellTypeMessage(data);
    });
    
    socketInstance.on('move_cell', (data) => {
      console.log('Socket.IO move_cell received:', data);
      handleMoveCellMessage(data);
    });
    
    socketInstance.on('read_cell_input_request', (data) => {
      console.log('Socket.IO read_cell_input_request received:', data);
      handleReadCellInputRequest(data, socketInstance);
    });
    
    socketInstance.on('read_cell_output_request', (data) => {
      console.log('Socket.IO read_cell_output_request received:', data);
      handleReadCellOutputRequest(data, socketInstance);
    });
    
    socketInstance.on('error', (data) => {
      console.error('Socket.IO error:', data);
      showAlert(`Socket.IO error: ${data.message}`, 'error');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setSocket(null);
      socketRef.current = null;
      setKernelStatus('idle');
      showAlert('Disconnected from server', 'warning');
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      showAlert('Socket.IO connection error', 'error');
      setKernelStatus('error');
    });
  };

  const handleSocketMessage = (data: any) => {
    if (typeof data.cell_index === 'number') {
      const cellIndex = data.cell_index;
      
      if (data.status === 'running') {
        setExecutingCells(prev => new Set(prev).add(cellIndex));
      } else if (data.status === 'completed' || data.status === 'error') {
        setExecutingCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellIndex);
          return newSet;
        });
        // Auto-save disabled for now to prevent server reload issues
        // setAutoSaveEnabled(true);
        // if (currentNotebook) {
        //   setTimeout(() => saveNotebook(), 100);
        // }
      }
      
      if (data.output) {
        setNotebookContent(prev => {
          const newContent = [...prev];
          const cell = newContent[cellIndex];
          if (cell) {
            if (data.append) {
              cell.outputs = [...(cell.outputs || []), data.output];
            } else {
              cell.outputs = [data.output];
            }
          }
          return newContent;
        });
      }
    }
  };

  const handleAddCellMessage = (data: any) => {
    const { cell_index, cell_type, content } = data;
    if (typeof cell_index === 'number') {
      setNotebookContent(prev => {
        const newContent = [...prev];
        // Insert new cell at the specified index
        newContent.splice(cell_index, 0, { 
          cell_type: cell_type || 'code', 
          source: [content || ''], 
          outputs: [] 
        });
        return newContent;
      });
    }
  };

  const handleDeleteCellMessage = (data: any) => {
    const { cell_index } = data;
    if (typeof cell_index === 'number') {
      setNotebookContent(prev => prev.filter((_, i) => i !== cell_index));
    }
  };

  const handleAlterCellContentMessage = (data: any) => {
    const { cell_index, content } = data;
    if (typeof cell_index === 'number' && typeof content === 'string') {
      updateCell(cell_index, { source: [content] });
    }
  };

  const handleSwapCellTypeMessage = (data: any) => {
    const { cell_index, new_type } = data;
    if (typeof cell_index === 'number' && (new_type === 'code' || new_type === 'markdown')) {
      updateCell(cell_index, { cell_type: new_type });
      
      // If swapping to markdown, exit edit mode for that cell
      if (new_type === 'markdown') {
        setEditingMarkdownCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cell_index);
          return newSet;
        });
      }
    }
  };

  const handleMoveCellMessage = (data: any) => {
    const { cell_index, new_index } = data;
    if (typeof cell_index === 'number' && typeof new_index === 'number') {
      setNotebookContent(prev => {
        const newContent = [...prev];
        // Move cell from cell_index to new_index
        const [movedCell] = newContent.splice(cell_index, 1);
        newContent.splice(new_index, 0, movedCell);
        return newContent;
      });
    }
  };

  const handleReadCellInputRequest = (data: any, socket: Socket) => {
    const { cell_index, request_id } = data;
    if (typeof cell_index === 'number' && request_id) {
      const cell = notebookContent[cell_index];
      if (cell) {
        const content = cell.source.join('');
        socket.emit('read_cell_input_response', { request_id, content });
      } else {
        socket.emit('read_cell_input_response', { request_id, content: '' });
      }
    }
  };

  const handleReadCellOutputRequest = (data: any, socket: Socket) => {
    const { cell_index, request_id } = data;
    if (typeof cell_index === 'number' && request_id) {
      const cell = notebookContent[cell_index];
      if (cell) {
        const outputs = cell.outputs || [];
        socket.emit('read_cell_output_response', { request_id, outputs });
      } else {
        socket.emit('read_cell_output_response', { request_id, outputs: [] });
      }
    }
  };

  // Notebook functions
  const loadNotebooks = async () => {
    try {
      const res = await fetch('/api/v1/notebooks');
      if (!res.ok) throw new Error(`Failed to load notebooks: ${res.status}`);
      const data = await res.json();
      setNotebooks(data.notebooks);
    } catch (error) {
      console.error(error);
      showAlert('Failed to load notebooks', 'error');
    }
  };

  const createNotebook = async () => {
    if (!newNotebookName.trim()) {
      showAlert('Please enter a notebook name', 'warning');
      return;
    }
    const finalName = newNotebookName.trim().endsWith('.py')
      ? newNotebookName.trim()
      : `${newNotebookName.trim()}.py`;
    try {
      const res = await fetch(`/api/v1/notebooks/${finalName}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to create notebook: ${res.status}`);
      setNotebooks((prev) => [...prev, finalName]);
      setNewNotebookName('');
      showAlert(`Notebook ${finalName} created successfully`, 'success');
    } catch (error) {
      console.error(error);
      showAlert('Failed to create notebook', 'error');
    }
  };

  const deleteNotebook = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/v1/notebooks/${name}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete notebook: ${res.status}`);
      setNotebooks((prev) => prev.filter((n) => n !== name));
      if (currentNotebook === name) {
        setCurrentNotebook(null);
        setNotebookContent([]);
      }
      showAlert(`Notebook ${name} deleted`, 'success');
    } catch (error) {
      console.error(error);
      showAlert('Failed to delete notebook', 'error');
    }
  };

  const openNotebook = async (name: string) => {
    try {
      const res = await fetch(`/api/v1/notebooks/${name}`);
      if (!res.ok) throw new Error(`Failed to open notebook: ${res.status}`);
      const data = await res.json();
      setCurrentNotebook(name);
      setNotebookContent(data.cells || []);
    } catch (error) {
      console.error(error);
      showAlert('Failed to open notebook', 'error');
    }
  };

  const saveNotebook = async () => {
    if (!currentNotebook) return;
    try {
      const notebookData = {
        cells: notebookContent,
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5
      };
      const res = await fetch(`/api/v1/notebooks/${currentNotebook}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notebookData),
      });
      if (!res.ok) throw new Error(`Failed to save notebook: ${res.status}`);
      showAlert(`Saved ${currentNotebook}`, 'success');
    } catch (error) {
      console.error(error);
      showAlert('Failed to save notebook', 'error');
    }
  };

  // Cell functions
  const addCell = () => {
    setNotebookContent((prev) => [...prev, { cell_type: 'code', source: [''], outputs: [] }]);
    // Auto-save disabled - manual save only
    // if (currentNotebook && autoSaveEnabled) {
    //   setTimeout(() => saveNotebook(), 100);
    // }
  };

  const updateCell = (index: number, patch: Partial<NotebookCellType>) => {
    setNotebookContent((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    // Auto-save disabled - manual save only
    // if (currentNotebook && autoSaveEnabled) {
    //   setTimeout(() => saveNotebook(), 100);
    // }
  };

  const executeCell = async (index: number) => {
    console.log('executeCell called for index:', index);
    const cell = notebookContent[index];
    if (cell.cell_type !== 'code') {
      console.log('Not a code cell, returning');
      return;
    }
    if (!cell.source.join('').trim()) {
      console.log('Cell is empty');
      showAlert('Cell is empty', 'warning');
      return;
    }
    console.log('Proceeding with cell execution');

    const currentSocket = socketRef.current;
    if (!currentSocket || !currentSocket.connected) {
      showAlert('Socket.IO not connected. Trying to execute via HTTP...', 'warning');
      // HTTP fallback
      try {
        const res = await fetch('/api/v1/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cell.source.join('') })
        });
        if (!res.ok) throw new Error(`Execution failed: ${res.status}`);
        const data = await res.json();
        updateCell(index, { outputs: data.outputs || [] });
        showAlert('Executed via HTTP fallback', 'info');
        return;
      } catch (error) {
        console.error(error);
        showAlert('HTTP execution also failed', 'error');
        return;
      }
    }
    
    try {
      // setAutoSaveEnabled(false);
      updateCell(index, { outputs: [] });
      setExecutingCells(prev => new Set(prev).add(index));
      
      const message = {
        cell_index: index,
        code: cell.source.join('')
      };
      
      console.log('Sending Socket.IO message:', message);
      currentSocket.emit('execute_code', message);
    } catch (error) {
      console.error(error);
      showAlert('Execution failed', 'error');
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
      // setAutoSaveEnabled(true);
    }
  };

  // Kernel functions
  const resetKernel = async () => {
    try {
      const res = await fetch('/api/v1/kernel/reset', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to reset kernel: ${res.status}`);
      setKernelStatus('running');
      setExecutingCells(new Set());
      showAlert('Global kernel reset successfully', 'success');
    } catch (error) {
      console.error(error);
      setKernelStatus('error');
      showAlert('Failed to reset kernel', 'error');
    }
  };

  const ensureKernel = async () => {
    try {
      const res = await fetch('/api/v1/kernel/ensure', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to ensure kernel: ${res.status}`);
      setKernelStatus('running');
      showAlert('Global kernel ensured', 'success');
    } catch (error) {
      console.error(error);
      setKernelStatus('error');
      showAlert('Failed to ensure kernel', 'error');
    }
  };

  // Utility functions
  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, severity });
  };

  const handleAlertClose = () => setAlert(null);

  const cleanAnsiCodes = (text: string): string => {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  };

  const pythonCompletion = async (context: CompletionContext) => {
    const word = context.matchBefore(/\w*$/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    try {
      const code = context.state.doc.toString();
      const cursor_pos = context.pos;
      
      const response = await fetch('/api/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cursor_pos })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const completions = data.completions;
      
      if (!completions.matches || completions.matches.length === 0) return null;
      
      return {
        from: completions.cursor_start,
        to: completions.cursor_end,
        options: completions.matches.map((match: string) => ({
          label: match,
          type: 'function'
        }))
      };
    } catch (error) {
      console.error('Completion error:', error);
      return null;
    }
  };

  // Debug functions
  const refreshKernelStatus = async () => {
    await checkKernelStatus();
  };

  const getSocketStatus = () => {
    // Use state to trigger re-renders, but check ref for actual status
    const currentSocket = socketRef.current || socket;
    if (!currentSocket) return 'Not Connected';
    return currentSocket.connected ? 'Connected' : 'Disconnected';
  };

  // Component handlers
  const handleToggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  
  const handleOpenDebugModal = () => {
    setDebugModalOpen(true);
    refreshKernelStatus();
  };
  
  const handleDeleteCell = (index: number) => {
    setNotebookContent(prev => prev.filter((_, i) => i !== index));
    // Auto-save disabled - manual save only
    // if (currentNotebook && autoSaveEnabled) {
    //   setTimeout(() => saveNotebook(), 100);
    // }
  };
  
  const handleToggleMarkdownEdit = (index: number) => {
    if (editingMarkdownCells.has(index)) {
      setEditingMarkdownCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
      if (currentNotebook && autoSaveEnabled) {
        setTimeout(() => saveNotebook(), 100);
      }
    } else {
      setEditingMarkdownCells(prev => new Set(prev).add(index));
    }
  };

  const handleMoveCellUp = (index: number) => {
    if (index > 0) {
      setNotebookContent(prev => {
        const newContent = [...prev];
        [newContent[index - 1], newContent[index]] = [newContent[index], newContent[index - 1]];
        return newContent;
      });
      // Auto-save disabled - manual save only
      // if (currentNotebook && autoSaveEnabled) {
      //   setTimeout(() => saveNotebook(), 100);
      // }
    }
  };

  const handleMoveCellDown = (index: number) => {
    if (index < notebookContent.length - 1) {
      setNotebookContent(prev => {
        const newContent = [...prev];
        [newContent[index], newContent[index + 1]] = [newContent[index + 1], newContent[index]];
        return newContent;
      });
      // Auto-save disabled - manual save only
      // if (currentNotebook && autoSaveEnabled) {
      //   setTimeout(() => saveNotebook(), 100);
      // }
    }
  };

  const handleFocusNextCell = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    
    // If there's a next cell, try to focus it
    if (nextIndex < notebookContent.length) {
      // Find the next cell's CodeMirror or textarea element
      setTimeout(() => {
        const nextCellElement = document.querySelector(`[data-cell-index="${nextIndex}"]`);
        if (nextCellElement) {
          // Look for CodeMirror editor
          const codeMirrorElement = nextCellElement.querySelector('.cm-editor .cm-content');
          if (codeMirrorElement) {
            (codeMirrorElement as HTMLElement).focus();
            return;
          }
          
          // Look for textarea (markdown edit mode)
          const textareaElement = nextCellElement.querySelector('textarea');
          if (textareaElement) {
            textareaElement.focus();
            return;
          }
        }
      }, 150);
    } else {
      // If there's no next cell, create a new one and focus it
      setNotebookContent(prev => [...prev, { cell_type: 'code', source: [''], outputs: [] }]);
      setTimeout(() => {
        const newCellElement = document.querySelector(`[data-cell-index="${nextIndex}"]`);
        if (newCellElement) {
          const codeMirrorElement = newCellElement.querySelector('.cm-editor .cm-content');
          if (codeMirrorElement) {
            (codeMirrorElement as HTMLElement).focus();
          }
        }
      }, 200);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      <Snackbar
        open={!!alert}
        autoHideDuration={4000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {alert ? (
          <Alert severity={alert.severity} onClose={handleAlertClose} variant="filled">
            {alert.message}
          </Alert>
        )  : <span />}
      </Snackbar>

      <Header
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onOpenDebugModal={handleOpenDebugModal}
        currentNotebook={currentNotebook}
        onSaveNotebook={saveNotebook}
        kernelStatus={kernelStatus}
        onResetKernel={resetKernel}
        onEnsureKernel={ensureKernel}
      />

      <Container maxWidth={false} sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {!sidebarCollapsed && (
            <Sidebar
              notebooks={notebooks}
              newNotebookName={newNotebookName}
              onNewNotebookNameChange={setNewNotebookName}
              onCreateNotebook={createNotebook}
              onOpenNotebook={openNotebook}
              onDeleteNotebook={deleteNotebook}
            />
          )}

          <Box sx={{ flex: 1, minWidth: 0, height: 'calc(100vh - 120px)', overflowY: 'auto', pr: 1 }}>
            <NotebookContainer
              currentNotebook={currentNotebook}
              notebookContent={notebookContent}
              executingCells={executingCells}
              editingMarkdownCells={editingMarkdownCells}
              onUpdateCell={updateCell}
              onExecuteCell={executeCell}
              onDeleteCell={handleDeleteCell}
              onAddCell={addCell}
              onToggleMarkdownEdit={handleToggleMarkdownEdit}
              onMoveCellUp={handleMoveCellUp}
              onMoveCellDown={handleMoveCellDown}
              onFocusNextCell={handleFocusNextCell}
              pythonCompletion={pythonCompletion}
              socket={socket}
              cleanAnsiCodes={cleanAnsiCodes}
            />
          </Box>
        </Box>
      </Container>

      <DebugModal
        open={debugModalOpen}
        onClose={() => setDebugModalOpen(false)}
        websocketStatus={getSocketStatus()}
        kernelStatus={kernelStatus}
        onRefreshStatus={refreshKernelStatus}
      />
    </ThemeProvider>
  );
}

export default App;