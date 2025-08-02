import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Snackbar } from '@mui/material';
import { CompletionContext } from '@codemirror/autocomplete';
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
    success: {
      main: '#14b8a6',
      dark: '#0d9488',
      light: '#5eead4'
    },
    error: {
      main: '#f97316',
      dark: '#ea580c',
      light: '#fb923c'
    }
  } 
});

function App() {
  // State
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [notebookContent, setNotebookContent] = useState<NotebookCellType[]>([]);
  const [kernelStatus, setKernelStatus] = useState<KernelStatus>('idle');
  const [kernelId, setKernelId] = useState<string | null>(null);
  const [newNotebookName, setNewNotebookName] = useState<string>('');
  const [alert, setAlert] = useState<
    | { message: string; severity: 'success' | 'error' | 'warning' | 'info' }
    | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [executingCells, setExecutingCells] = useState<Set<number>>(new Set());
  const [editingMarkdownCells, setEditingMarkdownCells] = useState<Set<number>>(new Set());
  const [debugModalOpen, setDebugModalOpen] = useState<boolean>(false);
  const [allKernels, setAllKernels] = useState<any[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);

  // Effects
  useEffect(() => {
    loadNotebooks();
    checkAndStartKernel();
  }, []);

  useEffect(() => {
    if (kernelId && !websocket) {
      connectWebSocket();
    }
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [kernelId]);

  // Kernel and WebSocket functions
  const checkAndStartKernel = async () => {
    try {
      const res = await fetch('/api/v1/kernel/status');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'running' && data.kernel_id) {
          setKernelId(data.kernel_id);
          setKernelStatus('running');
          console.log('Global kernel already running:', data.kernel_id);
        } else {
          await startKernel();
        }
      }
    } catch (error) {
      console.error('Failed to check kernel status:', error);
      await startKernel();
    }
  };

  const connectWebSocket = () => {
    if (!kernelId) return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/kernels/${kernelId}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected to kernel:', kernelId);
      setWebsocket(ws);
      showAlert('WebSocket connected', 'info');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWebsocket(null);
      if (kernelStatus === 'running') {
        setTimeout(() => connectWebSocket(), 2000);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      showAlert('WebSocket connection error', 'error');
    };
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'execution_result' && typeof data.cell_index === 'number') {
      const cellIndex = data.cell_index;
      
      if (data.status === 'running') {
        setExecutingCells(prev => new Set(prev).add(cellIndex));
      } else if (data.status === 'completed' || data.status === 'error') {
        setExecutingCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellIndex);
          return newSet;
        });
        setAutoSaveEnabled(true);
        if (currentNotebook) {
          setTimeout(() => saveNotebook(), 100);
        }
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
    if (currentNotebook && autoSaveEnabled) {
      setTimeout(() => saveNotebook(), 100);
    }
  };

  const updateCell = (index: number, patch: Partial<NotebookCellType>) => {
    setNotebookContent((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    if (currentNotebook && autoSaveEnabled) {
      setTimeout(() => saveNotebook(), 100);
    }
  };

  const executeCell = async (index: number) => {
    const cell = notebookContent[index];
    if (cell.cell_type !== 'code') return;
    if (!cell.source.join('').trim()) {
      showAlert('Cell is empty', 'warning');
      return;
    }
    
    if (!kernelId) {
      showAlert('No kernel running. Please start a kernel first.', 'warning');
      return;
    }

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      showAlert('WebSocket not connected. Falling back to HTTP execution.', 'warning');
      // HTTP fallback logic would go here
      return;
    }
    
    try {
      setAutoSaveEnabled(false);
      updateCell(index, { outputs: [] });
      setExecutingCells(prev => new Set(prev).add(index));
      
      const message = {
        type: 'execute_code',
        cell_index: index,
        code: cell.source.join('')
      };
      
      console.log('Sending WebSocket message:', message);
      websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(error);
      showAlert('Execution failed', 'error');
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
      setAutoSaveEnabled(true);
    }
  };

  // Kernel functions
  const startKernel = async () => {
    try {
      const res = await fetch('/api/v1/kernels', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to start kernel: ${res.status}`);
      const data = await res.json();
      setKernelId(data.kernel_id);
      setKernelStatus('running');
      showAlert('Global kernel started', 'success');
    } catch (error) {
      console.error(error);
      setKernelStatus('error');
      showAlert('Failed to start kernel', 'error');
    }
  };

  const stopKernel = async () => {
    if (!kernelId) return;
    
    const currentKernelId = kernelId;
    
    try {
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
      
      setKernelStatus('idle');
      setKernelId(null);
      setExecutingCells(new Set());
      
      const res = await fetch(`/api/v1/kernels/${currentKernelId}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error(`Kernel stop returned ${res.status}, but frontend cleaned up`);
        showAlert('Global kernel stopped (with cleanup issues)', 'warning');
      } else {
        showAlert('Global kernel stopped', 'info');
      }
    } catch (error) {
      console.error('Kernel stop error:', error);
      setKernelStatus('idle');
      setKernelId(null);
      setExecutingCells(new Set());
      setWebsocket(null);
      showAlert('Global kernel stopped (with cleanup issues)', 'warning');
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
    if (!kernelId) return null;

    const word = context.matchBefore(/\w*$/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    try {
      const code = context.state.doc.toString();
      const cursor_pos = context.pos;
      
      const response = await fetch(`/api/v1/kernels/${kernelId}/complete`, {
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
  const loadAllKernels = async () => {
    try {
      const res = await fetch('/api/v1/kernels');
      if (res.ok) {
        const data = await res.json();
        setAllKernels(Object.entries(data).map(([id, info]: [string, any]) => ({ id, ...info })));
      }
    } catch (error) {
      console.error('Failed to load kernels:', error);
    }
  };

  const getWebSocketStatus = () => {
    if (!websocket) return 'Not Connected';
    switch (websocket.readyState) {
      case WebSocket.CONNECTING: return 'Connecting';
      case WebSocket.OPEN: return 'Connected';
      case WebSocket.CLOSING: return 'Closing';
      case WebSocket.CLOSED: return 'Closed';
      default: return 'Unknown';
    }
  };

  // Component handlers
  const handleToggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  
  const handleOpenDebugModal = () => {
    setDebugModalOpen(true);
    loadAllKernels();
  };
  
  const handleDeleteCell = (index: number) => {
    setNotebookContent(prev => prev.filter((_, i) => i !== index));
    if (currentNotebook && autoSaveEnabled) {
      setTimeout(() => saveNotebook(), 100);
    }
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
              kernelStatus={kernelStatus}
              onStartKernel={startKernel}
              onStopKernel={stopKernel}
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
              pythonCompletion={pythonCompletion}
              cleanAnsiCodes={cleanAnsiCodes}
            />
          </Box>
        </Box>
      </Container>

      <DebugModal
        open={debugModalOpen}
        onClose={() => setDebugModalOpen(false)}
        websocketStatus={getWebSocketStatus()}
        kernelId={kernelId}
        allKernels={allKernels}
        onRefreshKernels={loadAllKernels}
      />
    </ThemeProvider>
  );
}

export default App;