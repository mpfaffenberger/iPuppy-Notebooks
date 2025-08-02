import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Card,
  CardContent,
  Select,
  MenuItem,
  Button,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { PlayArrow, Stop, Add, Save, Delete, Menu, ChevronLeft } from '@mui/icons-material';
import { marked } from 'marked';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import './index.css';

// Configure marked for sanitised markdown rendering
marked.setOptions({});

export type NotebookCell = {
  cell_type: 'code' | 'markdown';
  source: string[];
  outputs?: string[];
};

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
  /** ------------------------------------------------------
   *  -------------  Local component state  ----------------
   *  ---------------------------------------------------- */
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [notebookContent, setNotebookContent] = useState<NotebookCell[]>([]);
  const [kernelStatus, setKernelStatus] = useState<'idle' | 'running' | 'error'>('idle');
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

  /** ------------------------------------------------------
   *  ------------------  Effects  -------------------------
   *  ---------------------------------------------------- */
  useEffect(() => {
    // Initial load
    loadNotebooks();
  }, []);

  // WebSocket connection management
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

  const connectWebSocket = () => {
    if (!kernelId) return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/kernels/${kernelId}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebsocket(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWebsocket(null);
      // Attempt to reconnect if kernel is still running
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
      }
      
      // Update cell output with streaming data
      if (data.output) {
        setNotebookContent(prev => {
          const newContent = [...prev];
          const cell = newContent[cellIndex];
          if (cell) {
            if (data.append) {
              // Append to existing outputs
              cell.outputs = [...(cell.outputs || []), data.output];
            } else {
              // Replace outputs
              cell.outputs = [data.output];
            }
          }
          return newContent;
        });
      }
    }
  };

  /** ------------------------------------------------------
   *  ----------------  API  MOCKS  ------------------------
   *  Replace these with real API calls once backend ready.
   *  ---------------------------------------------------- */
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

  /** ------------------------------------------------------
   *  ---------------  Cell manipulation -------------------
   *  ---------------------------------------------------- */
  const addCell = () => {
    setNotebookContent((prev) => [...prev, { cell_type: 'code', source: [''], outputs: [] }]);
  };

  const updateCell = (index: number, patch: Partial<NotebookCell>) => {
    setNotebookContent((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
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
      showAlert('WebSocket not connected. Please restart the kernel.', 'error');
      return;
    }
    
    try {
      // Clear previous output and mark as executing
      updateCell(index, { outputs: [] });
      setExecutingCells(prev => new Set(prev).add(index));
      
      // Send execution request via WebSocket
      const message = {
        type: 'execute_code',
        cell_index: index,
        code: cell.source.join('')
      };
      
      websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(error);
      showAlert('Execution failed', 'error');
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  /** ------------------------------------------------------
   *  ------------------  Kernel  --------------------------
   *  ---------------------------------------------------- */
  const startKernel = async () => {
    try {
      const res = await fetch('/api/v1/kernels', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to start kernel: ${res.status}`);
      const data = await res.json();
      setKernelId(data.kernel_id);
      setKernelStatus('running');
      showAlert('Kernel started', 'success');
    } catch (error) {
      console.error(error);
      setKernelStatus('error');
      showAlert('Failed to start kernel', 'error');
    }
  };

  const stopKernel = async () => {
    if (!kernelId) return;
    try {
      // Close WebSocket connection first
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
      
      const res = await fetch(`/api/v1/kernels/${kernelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to stop kernel: ${res.status}`);
      setKernelStatus('idle');
      setKernelId(null);
      setExecutingCells(new Set()); // Clear executing cells
      showAlert('Kernel stopped', 'info');
    } catch (error) {
      console.error(error);
      setKernelStatus('error');
      showAlert('Failed to stop kernel', 'error');
    }
  };

  /** ------------------------------------------------------
   *  -----------------  UI helpers  -----------------------
   *  ---------------------------------------------------- */
  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, severity });
  };

  const handleAlertClose = () => setAlert(null);

  // Function to clean ANSI escape codes from text
  const cleanAnsiCodes = (text: string): string => {
    // Remove ANSI escape sequences
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  };

  /** ------------------------------------------------------
   *  ---------------------  JSX  --------------------------
   *  ---------------------------------------------------- */
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {/* Global snackbar for alerts */}
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

      {/* App bar */}
      <AppBar position="static" color="default">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              sx={{ mr: 1 }}
            >
              {sidebarCollapsed ? <Menu /> : <ChevronLeft />}
            </IconButton>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fas fa-paw" /> 🐶🐕🦮 iPuppy Notebooks 🐕‍🦺🐩🐕
            </Typography>
          </Box>
          {currentNotebook && (
            <Box display="flex" alignItems="center" gap={2}>
              <Typography>🐶 {currentNotebook} 🐕</Typography>
              <Button variant="contained" size="small" startIcon={<Save />} onClick={saveNotebook}>
                🐕 Save 🐶
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main layout */}
      <Container maxWidth={false} sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* ---------------- Sidebar ---------------- */}
          {!sidebarCollapsed && (
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
                          onClick={() => openNotebook(nb)}
                        >
                          {nb}
                        </Typography>
                        <Box>
                          <IconButton size="small" sx={{ color: '#14b8a6' }} onClick={() => openNotebook(nb)}>
                            <PlayArrow fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#f97316' }} onClick={() => deleteNotebook(nb)}>
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
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    placeholder="🐶 Notebook name"
                    style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #555', background: '#1e1e1e', color: '#eaeaea' }}
                  />
                  <Button variant="contained" startIcon={<Add />} onClick={createNotebook}>
                    🐶 Create
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Kernel status */}
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>🚀 Kernel Status</Typography>
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
                    sx={{ backgroundColor: '#14b8a6', '&:hover': { backgroundColor: '#0d9488' }, '&:disabled': { backgroundColor: 'action.disabledBackground' } }}
                    startIcon={<PlayArrow />}
                    fullWidth
                    disabled={kernelStatus === 'running'}
                    onClick={startKernel}
                  >
                    🚀 Start
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: '#f97316', '&:hover': { backgroundColor: '#ea580c' }, '&:disabled': { backgroundColor: 'action.disabledBackground' } }}
                    startIcon={<Stop />}
                    fullWidth
                    disabled={kernelStatus === 'idle'}
                    onClick={stopKernel}
                  >
                    Stop
                  </Button>
                </Box>
              </CardContent>
            </Card>
            </Box>
          )}

          {/* --------------- Main area ---------------- */}
          <Box sx={{ flex: 1, minWidth: 0, height: 'calc(100vh - 120px)', overflowY: 'auto', pr: 1 }}>
            {currentNotebook ? (
              <Box>
                {notebookContent.map((cell, idx) => (
                  <Box key={idx} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    {/* Cell header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Select
                        size="small"
                        value={cell.cell_type}
                        onChange={(e) =>
                          updateCell(idx, { cell_type: e.target.value as 'code' | 'markdown' })
                        }
                        sx={{ width: 120 }}
                      >
                        <MenuItem value="code">Code</MenuItem>
                        <MenuItem value="markdown">Markdown</MenuItem>
                      </Select>
                      <Button 
                        size="small" 
                        variant="contained" 
                        disabled={cell.cell_type === 'code' && executingCells.has(idx)}
                        sx={{ backgroundColor: '#14b8a6', '&:hover': { backgroundColor: '#0d9488' }, '&:disabled': { backgroundColor: 'action.disabledBackground' } }} 
                        startIcon={<PlayArrow />} 
                        onClick={() => {
                          if (cell.cell_type === 'markdown') {
                            if (editingMarkdownCells.has(idx)) {
                              setEditingMarkdownCells(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(idx);
                                return newSet;
                              });
                            } else {
                              setEditingMarkdownCells(prev => new Set(prev).add(idx));
                            }
                          } else {
                            executeCell(idx);
                          }
                        }}
                      >
                        {cell.cell_type === 'markdown' 
                          ? (editingMarkdownCells.has(idx) ? '✓ Preview' : '✏️ Edit')
                          : (executingCells.has(idx) ? '⏳ Running...' : '🚀 Run')
                        }
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small" variant="outlined" sx={{ color: '#f97316', borderColor: '#f97316', '&:hover': { backgroundColor: '#f97316', color: 'white' } }} startIcon={<Delete />} onClick={() => {
                        setNotebookContent(prev => prev.filter((_, i) => i !== idx));
                      }}>
                        Delete
                      </Button>
                    </Box>

                    {/* Cell content */}
                    <Box sx={{ p: 0 }}>
                      {cell.cell_type === 'markdown' ? (
                        editingMarkdownCells.has(idx) ? (
                          <textarea
                            style={{ 
                              width: '100%', 
                              minHeight: 120, 
                              background: '#1e1e1e', 
                              color: '#eaeaea', 
                              padding: 16,
                              border: 'none',
                              outline: 'none',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                            value={cell.source.join('')}
                            onChange={(e) => updateCell(idx, { source: [e.target.value] })}
                            onBlur={() => {
                              setEditingMarkdownCells(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(idx);
                                return newSet;
                              });
                            }}
                            autoFocus
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              p: 2, 
                              minHeight: 120, 
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover' }
                            }}
                            onClick={() => {
                              setEditingMarkdownCells(prev => new Set(prev).add(idx));
                            }}
                          >
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: cell.source.join('').trim() 
                                  ? marked(cell.source.join('')) 
                                  : '<em style="color: #666;">Click to edit markdown...</em>'
                              }}
                              style={{
                                color: '#eaeaea',
                                lineHeight: '1.6'
                              }}
                            />
                          </Box>
                        )
                      ) : (
                        <CodeMirror
                          value={cell.source.join('')}
                          height="200px"
                          extensions={[python()]}
                          theme={dracula}
                          onChange={(val) => updateCell(idx, { source: [val] })}
                        />
                      )}
                    </Box>

                    {/* Cell output - only show for code cells */}
                    {cell.cell_type === 'code' && (
                      <Box sx={{ p: 2, backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider', minHeight: '60px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Output:</Typography>
                          {executingCells.has(idx) && (
                            <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              ⏳ Executing...
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                          {cell.outputs?.length ? (
                            Array.isArray(cell.outputs) ? (
                              cell.outputs.map((output, i) => (
                                <div key={i}>
                                  {typeof output === 'string' 
                                    ? cleanAnsiCodes(output)
                                    : (output && typeof output === 'object' && 'text' in output 
                                        ? cleanAnsiCodes((output as any).text)
                                        : JSON.stringify(output, null, 2))
                                  }
                                </div>
                              ))
                            ) : (
                              typeof cell.outputs === 'string' 
                                ? cleanAnsiCodes(cell.outputs)
                                : (cell.outputs && typeof cell.outputs === 'object' && 'text' in cell.outputs 
                                    ? cleanAnsiCodes((cell.outputs as any).text)
                                    : JSON.stringify(cell.outputs, null, 2))
                            )
                          ) : executingCells.has(idx) ? (
                            <Typography color="text.secondary" fontStyle="italic">Waiting for output...</Typography>
                          ) : (
                            <Typography color="text.secondary" fontStyle="italic">No output yet</Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
                <Box mt={2}>
                  <Button variant="contained" startIcon={<Add />} onClick={addCell}>
                    🐶 Add Cell
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" mt={8} color="text.secondary">
                <Typography variant="h4" gutterBottom>🐶 Welcome to iPuppy Notebooks! 🚀</Typography>
                <Typography gutterBottom>Select a notebook or create a new one to begin your coding adventure! 🐕‍🦺</Typography>
                <i className="fas fa-paw fa-3x" style={{ color: '#8a2be2' }} />
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;