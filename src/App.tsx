import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Button, Box, Container, Grid, Card, CardContent, Typography, Select, MenuItem, IconButton, Alert } from '@mui/material';
import { PlayArrow, Stop, Add, Save, Delete } from '@mui/icons-material';
import { marked } from 'marked';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import './index.css';

// Set up marked with security options
marked.setOptions({
  sanitize: true,
  highlight: (code, lang) => {
    // Simple highlighting for code blocks
    return code;
  }
});

function App() {
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [notebookContent, setNotebookContent] = useState<any[]>([]);
  const [kernelStatus, setKernelStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [alert, setAlert] = useState<{message: string, severity: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  const [newNotebookName, setNewNotebookName] = useState('');

  // Load notebooks on component mount
  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      // Mock API call - replace with actual API call
      // const response = await fetch('/api/v1/notebooks');
      // const data = await response.json();
      // setNotebooks(data.notebooks);
      
      // For now, using mock data
      setNotebooks(['notebook1.py', 'notebook2.py', 'test_notebook.py']);
    } catch (error) {
      showAlert('Failed to load notebooks', 'error');
    }
  };

  const createNotebook = async () => {
    if (!newNotebookName.trim()) {
      showAlert('Please enter a notebook name', 'warning');
      return;
    }

    const notebookName = newNotebookName.trim().endsWith('.py') ? newNotebookName.trim() : newNotebookName.trim() + '.py';
    
    try {
      // Mock API call
      // await fetch(`/api/v1/notebooks/${notebookName}`, { method: 'POST' });
      
      setNotebooks([...notebooks, notebookName]);
      setNewNotebookName('');
      showAlert(`Notebook ${notebookName} created successfully`, 'success');
    } catch (error) {
      showAlert(`Failed to create notebook: ${error.message}`, 'error');
    }
  };

  const deleteNotebook = async (notebookName: string) => {
    if (!confirm(`Are you sure you want to delete ${notebookName}?`)) {
      return;
    }

    try {
      // Mock API call
      // await fetch(`/api/v1/notebooks/${notebookName}`, { method: 'DELETE' });
      
      setNotebooks(notebooks.filter(nb => nb !== notebookName));
      
      // If we're currently viewing this notebook, close it
      if (currentNotebook === notebookName) {
        setCurrentNotebook(null);
        setNotebookContent([]);
      }
      
      showAlert(`Notebook ${notebookName} deleted successfully`, 'success');
    } catch (error) {
      showAlert(`Failed to delete notebook: ${error.message}`, 'error');
    }
  };

  const openNotebook = async (notebookName: string) => {
    try {
      // Mock API call
      // const response = await fetch(`/api/v1/notebooks/${notebookName}`);
      // const data = await response.json();
      
      // For now, using mock data
      const mockData = {
        cells: [
          { cell_type: 'code', source: ['print("Hello, World!")'], outputs: ['Hello, World!\n'] },
          { cell_type: 'markdown', source: ['## This is a markdown cell\n\nThis is some **bold text** and *italic text*.'] }
        ]
      };
      
      setCurrentNotebook(notebookName);
      setNotebookContent(mockData.cells);
    } catch (error) {
      showAlert(`Failed to open notebook: ${error.message}`, 'error');
    }
  };

  const addCell = () => {
    setNotebookContent([...notebookContent, { cell_type: 'code', source: [''], outputs: [] }]);
  };

  const executeCell = async (index: number) => {
    const cell = notebookContent[index];
    
    if (!cell.source || !cell.source.join('').trim()) {
      showAlert('Cell is empty', 'warning');
      return;
    }

    // Mock execution
    if (cell.cell_type === 'code') {
      // Simulate code execution
      const outputs = [cell.source.join(' ') + '\n'];
      
      const updatedContent = [...notebookContent];
      updatedContent[index] = { ...cell, outputs };
      setNotebookContent(updatedContent);
    }
  };

  const startKernel = async () => {
    setKernelStatus('running');
    
    try {
      // Mock API call
      // const response = await fetch('/api/v1/kernels', { method: 'POST' });
      // const data = await response.json();
      // currentKernelId = data.kernel_id;
      
      setKernelStatus('running');
      showAlert('Kernel started successfully', 'success');
    } catch (error) {
      setKernelStatus('error');
      showAlert(`Failed to start kernel: ${error.message}`, 'error');
    }
  };

  const stopKernel = async () => {
    if (kernelStatus === 'idle') {
      showAlert('No kernel is currently running', 'warning');
      return;
    }

    setKernelStatus('idle');
    
    try {
      // Mock API call
      // await fetch(`/api/v1/kernels/${currentKernelId}`, { method: 'DELETE' });
      
      setKernelStatus('idle');
      showAlert('Kernel stopped successfully', 'info');
    } catch (error) {
      setKernelStatus('error');
      showAlert(`Failed to stop kernel: ${error.message}`, 'error');
    }
  };

  const saveNotebook = async () => {
    if (!currentNotebook) {
      showAlert('No notebook is currently open', 'warning');
      return;
    }

    try {
      // Mock API call
      // await fetch(`/api/v1/notebooks/${currentNotebook}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ cells: notebookContent })
      // });
      
      showAlert(`Notebook ${currentNotebook} saved successfully`, 'success');
    } catch (error) {
      showAlert(`Failed to save notebook: ${error.message}`, 'error');
    }
  };

  const updateCell = (index: number, field: 'source' | 'cell_type', value: any) => {
    const updatedContent = [...notebookContent];
    if (field === 'source') {
      updatedContent[index] = { ...updatedContent[index], source: [value] };
    } else {
      updatedContent[index] = { ...updatedContent[index], cell_type: value };
    }
    setNotebookContent(updatedContent);
  };

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, severity });
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <CssBaseline />
      <Box className="dark" style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
        {/* Alert container */}
        {alert && (
          <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1300, width: 'auto' }}>
            <Alert severity={alert.severity} onClose={() => setAlert(null)}>
              {alert.message}
            </Alert>
          </Box>
        )}

        // Navbar
        <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2 }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              <Box sx={{ display: 'flex', alignItems: 'center' }}
                <Typography variant="h6" component="div" sx={{ mr: 2 }} style={{ color: '#8a2be2' }}
                  <span style={{ marginRight: '8px' }}><i className="fas fa-paw"></i></span>
                  iPuppy Notebooks
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}
                {currentNotebook && (
                  <>
                    <Typography variant="body1" sx={{ mr: 2 }}>
                      {currentNotebook}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={saveNotebook}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                  </>
                )}
              </Box>
            </Container>
          </Box>
        </Box>

        // Main content
        <Container maxWidth="xl" sx={{ mt: 3, flexGrow: 1 }}
          <Grid container spacing={3}>>
            // Sidebar
            <Grid item xs={12} md={3}>
              // Notebooks list
              <Card className="sidebar" sx={{ mb: 3 }}
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Notebooks
                  </Typography>
                  <Box id="file-list">
                    {notebooks.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No notebooks yet
                      </Typography>
                    ) : (
                      notebooks.map((notebook) => (
                        <Box
                          key={notebook}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            backgroundColor: 'surface'
                          }}
                        >
                          <Typography variant="body1" onClick={() => openNotebook(notebook)} style={{ cursor: 'pointer' }}>
                            {notebook}
                          </Typography>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => openNotebook(notebook)}
                              aria-label="run notebook"
                              color="success"
                            >
                              <PlayArrow fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteNotebook(notebook)}
                              aria-label="delete notebook"
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                  // Form
                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <input
                      type="text"
                      className="form-control"
                      value={newNotebookName}
                      onChange={(e) => setNewNotebookName(e.target.value)}
                      placeholder="Notebook name"
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #444',
                        backgroundColor: '#1e1e1e',
                        color: '#e5e5e5'
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={createNotebook}
                      startIcon={<Add />}
                    >
                      Create
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              // Kernel status
              <Card className="sidebar">
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Kernel Status
                  </Typography>
                  <Box
                    id="kernel-status"
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 1,
                      backgroundColor:
                        kernelStatus === 'idle' ? 'action.disabled' :
                        kernelStatus === 'running' ? 'success.dark' : 'error.dark',
                      color: 'common.white',
                      textAlign: 'center'
                    }}
                  >
                    {kernelStatus === 'idle' ? 'Idle' : kernelStatus === 'running' ? 'Running' : 'Error'}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={startKernel}
                      startIcon={<PlayArrow />}
                      fullWidth
                      disabled={kernelStatus === 'running'}
                    >
                      Start
                    </Button>
                    <Button
                      variant="contained"
                      onClick={stopKernel}
                      startIcon={<Stop />}
                      fullWidth
                      disabled={kernelStatus === 'idle'}
                      color="error"
                    >
                      Stop
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            // Main content area
            <Grid item xs={12} md={9}>
              {currentNotebook ? (
                <Box id="notebook-container">
                  {notebookContent.map((cell, index) => (
                    <Box key={index} className="notebook-cell">
                      <Box className="cell-header">
                        <Select
                          value={cell.cell_type}
                          onChange={(e) => updateCell(index, 'cell_type', e.target.value)}
                          size="small"
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="code">Code</MenuItem>
                          <MenuItem value="markdown">Markdown</MenuItem>
                        </Select>
                        <Box>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => executeCell(index)}
                            startIcon={<PlayArrow />}
                            sx={{ mr: 1 }}
                          >
                            Run
                          </Button>
                        </Box>
                      </Box>
                      <Box className="cell-content">
                        {cell.cell_type === 'markdown' ? (
                          <textarea
                            value={cell.source.join('')}
                            onChange={(e) => updateCell(index, 'source', e.target.value)}
                            rows={5}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #444',
                              backgroundColor: '#1e1e1e',
                              color: '#e5e5e5',
                              fontFamily: 'monospace'
                            }}
                          />
                        ) : (
                          <CodeMirror
                            value={cell.source.join('')}
                            height="200px"
                            extensions={[python()]}
                            theme={dracula}
                            onChange={(value) => updateCell(index, 'source', value)}
                          />
                        )}
                      </Box>
                      <Box className="cell-output">
                        {cell.outputs ? cell.outputs.join('') : 'No output yet'}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box textAlign="center" mt={5} style={{ color: '#888' }}
                  <Typography variant="h4" gutterBottom>
                    Welcome to iPuppy Notebooks!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Select a notebook or create a new one to get started
                  </Typography>
                  <i className="fas fa-paw fa-3x" style={{ color: '#8a2be2', marginTop: '20px' }}></i>
                </Box>
              )}

              {currentNotebook && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={addCell}
                    startIcon={<Add />}
                  >
                    Add Cell
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>;
  }

  export default App;
