import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  Button,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { PlayArrow, Stop, Add, Save, Delete } from '@mui/icons-material';
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

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function App() {
  /** ------------------------------------------------------
   *  -------------  Local component state  ----------------
   *  ---------------------------------------------------- */
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [notebookContent, setNotebookContent] = useState<NotebookCell[]>([]);
  const [kernelStatus, setKernelStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [newNotebookName, setNewNotebookName] = useState<string>('');
  const [alert, setAlert] = useState<
    | { message: string; severity: 'success' | 'error' | 'warning' | 'info' }
    | null
  >(null);

  /** ------------------------------------------------------
   *  ------------------  Effects  -------------------------
   *  ---------------------------------------------------- */
  useEffect(() => {
    // Initial load
    loadNotebooks();
  }, []);

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
      // await fetch(`/api/v1/notebooks/${name}`, { method: 'DELETE' });
      setNotebooks((prev) => prev.filter((n) => n !== name));
      if (currentNotebook === name) {
        setCurrentNotebook(null);
        setNotebookContent([]);
      }
      showAlert(`Notebook ${name} deleted`, 'success');
    } catch {
      showAlert('Failed to delete notebook', 'error');
    }
  };

  const openNotebook = async (name: string) => {
    try {
      // const res = await fetch(`/api/v1/notebooks/${name}`);
      // const data = await res.json();
      // setNotebookContent(data.cells);
      const mockCells: NotebookCell[] = [
        { cell_type: 'code', source: ['print("Hello World")'], outputs: ['Hello World\n'] },
        { cell_type: 'markdown', source: ['## Markdown cell\n\nAwesome content!'] },
      ];
      setCurrentNotebook(name);
      setNotebookContent(mockCells);
    } catch {
      showAlert('Failed to open notebook', 'error');
    }
  };

  const saveNotebook = async () => {
    if (!currentNotebook) return;
    try {
      // await fetch(`/api/v1/notebooks/${currentNotebook}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ cells: notebookContent }),
      // });
      showAlert(`Saved ${currentNotebook}`, 'success');
    } catch {
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
    try {
      // const res = await fetch(`/api/v1/kernels/execute`, { ... });
      // const data = await res.json();
      const mockOutput = [`Executed: ${cell.source.join('')}
`];
      updateCell(index, { outputs: mockOutput });
    } catch {
      showAlert('Execution failed', 'error');
    }
  };

  /** ------------------------------------------------------
   *  ------------------  Kernel  --------------------------
   *  ---------------------------------------------------- */
  const startKernel = async () => {
    try {
      setKernelStatus('running');
      // await fetch('/api/v1/kernels', { method: 'POST' });
      showAlert('Kernel started', 'success');
    } catch {
      setKernelStatus('error');
      showAlert('Failed to start kernel', 'error');
    }
  };

  const stopKernel = async () => {
    try {
      setKernelStatus('idle');
      // await fetch('/api/v1/kernels/current', { method: 'DELETE' });
      showAlert('Kernel stopped', 'info');
    } catch {
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
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fas fa-paw" /> iPuppy Notebooks
          </Typography>
          {currentNotebook && (
            <Box display="flex" alignItems="center" gap={2}>
              <Typography>{currentNotebook}</Typography>
              <Button variant="contained" size="small" startIcon={<Save />} onClick={saveNotebook}>
                Save
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main layout */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        <Grid container spacing={3}>
          {/* ---------------- Sidebar ---------------- */}
          <Grid item xs={12} md={3}>
            {/* Notebook list */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>Notebooks</Typography>
                <Box>
                  {notebooks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No notebooks yet</Typography>
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
                          <IconButton size="small" color="success" onClick={() => openNotebook(nb)}>
                            <PlayArrow fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteNotebook(nb)}>
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
                    placeholder="Notebook name"
                    style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #555', background: '#1e1e1e', color: '#eaeaea' }}
                  />
                  <Button variant="contained" startIcon={<Add />} onClick={createNotebook}>
                    Create
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Kernel status */}
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>Kernel Status</Typography>
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
                        ? 'success.dark'
                        : 'error.dark',
                  }}
                >
                  {kernelStatus.charAt(0).toUpperCase() + kernelStatus.slice(1)}
                </Box>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    fullWidth
                    disabled={kernelStatus === 'running'}
                    onClick={startKernel}
                  >
                    Start
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
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
          </Grid>

          {/* --------------- Main area ---------------- */}
          <Grid item xs={12} md={9}>
            {currentNotebook ? (
              <Box>
                {notebookContent.map((cell, idx) => (
                  <Box key={idx} className="notebook-cell">
                    {/* Cell header */}
                    <Box className="cell-header">
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
                      <Button size="small" variant="contained" startIcon={<PlayArrow />} onClick={() => executeCell(idx)}>
                        Run
                      </Button>
                    </Box>

                    {/* Cell content */}
                    <Box className="cell-content">
                      {cell.cell_type === 'markdown' ? (
                        <textarea
                          style={{ width: '100%', minHeight: 120, background: '#1e1e1e', color: '#eaeaea', padding: 8 }}
                          value={cell.source.join('')}
                          onChange={(e) => updateCell(idx, { source: [e.target.value] })}
                        />
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

                    {/* Cell output */}
                    <Box className="cell-output">
                      {cell.outputs?.length ? cell.outputs.join('') : 'No output yet'}
                    </Box>
                  </Box>
                ))}
                <Box mt={2}>
                  <Button variant="contained" startIcon={<Add />} onClick={addCell}>
                    Add Cell
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" mt={8} color="text.secondary">
                <Typography variant="h4" gutterBottom>Welcome to iPuppy Notebooks!</Typography>
                <Typography gutterBottom>Select a notebook or create a new one to begin.</Typography>
                <i className="fas fa-paw fa-3x" style={{ color: '#8a2be2' }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

export default App;